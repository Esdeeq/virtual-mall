// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MallEscrow}     from "../MallEscrow.sol";
import {MockERC20}      from "../test-helpers/MockERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Handler
//
// The fuzzer drives only this contract. Every action it can take mirrors a
// real call path on MallEscrow. Ghost variables track what the test believes
// totalPending should be; the invariant then checks that the contract agrees.
// ─────────────────────────────────────────────────────────────────────────────
contract MallEscrowHandler is Test {

    MallEscrow  public escrow;
    MockERC20   public usdc;

    address internal owner;
    uint256 internal merchantPk;
    address internal merchantAddr;

    // Ghost accounting: sum of amounts that should still be Pending.
    uint256 public ghostPending;

    // Ordered list of open order IDs so we can pick one in O(1).
    bytes32[] internal _openOrders;
    // Map orderId → index+1 in _openOrders (0 = not present).
    mapping(bytes32 => uint256) internal _orderIndex;

    // Incrementing seed to generate unique order IDs.
    uint256 internal _orderSeed;

    bytes32 internal constant ORDER_AUTH_TYPEHASH =
        keccak256("OrderAuth(bytes32 orderId,address buyer,uint256 amount)");

    constructor(
        MallEscrow  _escrow,
        MockERC20   _usdc,
        address     _owner,
        uint256     _merchantPk,
        address     _merchantAddr
    ) {
        escrow      = _escrow;
        usdc        = _usdc;
        owner       = _owner;
        merchantPk  = _merchantPk;
        merchantAddr = _merchantAddr;
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /// @dev Creates a new order with a random amount (1 – 10 000 USDC).
    function deposit(uint256 amount) external {
        amount = bound(amount, 1, 10_000e6);

        address buyer = address(this);

        // Mint and approve for this call.
        usdc.mint(buyer, amount);
        usdc.approve(address(escrow), amount);

        bytes32 orderId = keccak256(abi.encode("handler-order", _orderSeed++));

        // Sign with the real merchant key.
        bytes32 structHash = keccak256(
            abi.encode(ORDER_AUTH_TYPEHASH, orderId, buyer, amount)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(merchantPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        try escrow.deposit(orderId, amount, sig) {
            ghostPending += amount;
            _openOrders.push(orderId);
            _orderIndex[orderId] = _openOrders.length; // 1-based
        } catch {
            // If the contract reverts for any reason, state is unchanged.
        }
    }

    /// @dev Buyer (this contract) confirms receipt on a random open order.
    function confirmReceipt(uint256 seed) external {
        if (_openOrders.length == 0) return;
        uint256 idx = seed % _openOrders.length;
        bytes32 orderId = _openOrders[idx];

        (, , uint256 amount, , MallEscrow.Status status) = escrow.orders(orderId);
        if (status != MallEscrow.Status.Pending) {
            _removeOrder(idx);
            return;
        }

        try escrow.confirmReceipt(orderId) {
            ghostPending -= amount;
            _removeOrder(idx);
        } catch {}
    }

    /// @dev Merchant claims a random order after timeout.
    function claim(uint256 seed) external {
        if (_openOrders.length == 0) return;
        uint256 idx = seed % _openOrders.length;
        bytes32 orderId = _openOrders[idx];

        (, , uint256 amount, uint256 claimAfter, MallEscrow.Status status) =
            escrow.orders(orderId);

        if (status != MallEscrow.Status.Pending) {
            _removeOrder(idx);
            return;
        }
        if (block.timestamp < claimAfter) return; // not yet claimable

        vm.prank(merchantAddr);
        try escrow.claim(orderId) {
            ghostPending -= amount;
            _removeOrder(idx);
        } catch {}
    }

    /// @dev Owner refunds a random order.
    function refund(uint256 seed) external {
        if (_openOrders.length == 0) return;
        uint256 idx = seed % _openOrders.length;
        bytes32 orderId = _openOrders[idx];

        (, , uint256 amount, , MallEscrow.Status status) = escrow.orders(orderId);
        if (status != MallEscrow.Status.Pending) {
            _removeOrder(idx);
            return;
        }

        vm.prank(owner);
        try escrow.refund(orderId) {
            ghostPending -= amount;
            _removeOrder(idx);
        } catch {}
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _removeOrder(uint256 idx) internal {
        uint256 last = _openOrders.length - 1;
        bytes32 lastId = _openOrders[last];
        _openOrders[idx] = lastId;
        _orderIndex[lastId] = idx + 1;
        _openOrders.pop();
        // The replaced orderId's index entry can remain stale — we only use
        // the array for enumeration.
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant test contract
// ─────────────────────────────────────────────────────────────────────────────
contract MallEscrowInvariantTest is Test {

    MallEscrow          internal escrow;
    MockERC20           internal usdc;
    MallEscrowHandler   internal handler;

    address internal owner = makeAddr("inv-owner");

    uint256 internal merchantPk;
    address internal merchantAddr;
    uint256 internal signerPk;
    address internal signerAddr;

    uint256 internal constant INITIAL_TIMEOUT = 7 days;

    function setUp() public {
        (merchantAddr, merchantPk) = makeAddrAndKey("inv-merchant");
        (signerAddr,   signerPk)   = makeAddrAndKey("inv-signer");

        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        vm.prank(owner);
        escrow = new MallEscrow(
            address(usdc),
            merchantAddr,
            owner,
            INITIAL_TIMEOUT,
            signerAddr
        );

        handler = new MallEscrowHandler(
            escrow,
            usdc,
            owner,
            signerPk,
            merchantAddr
        );

        // Only let the fuzzer drive the handler.
        targetContract(address(handler));
    }

    // INVARIANT 1: escrow.totalPending() always equals the handler's ghost sum.
    function invariant_TotalPendingMatchesGhost() public view {
        assertEq(
            escrow.totalPending(),
            handler.ghostPending(),
            "totalPending diverged from ghost"
        );
    }

    // INVARIANT 2: the escrow's USDC balance is always >= totalPending.
    //              (It can be higher only if someone accidentally sends tokens
    //               directly, which can't happen in this hermetic test.)
    function invariant_EscrowBalanceCoversPending() public view {
        assertGe(
            usdc.balanceOf(address(escrow)),
            escrow.totalPending(),
            "escrow balance < totalPending"
        );
    }

    // INVARIANT 3: totalPending never underflows (Solidity 0.8 guarantees revert,
    //              but we assert non-overflow explicitly as a belt-and-braces check).
    function invariant_TotalPendingNeverUnderflows() public view {
        assertLe(
            escrow.totalPending(),
            type(uint128).max,
            "totalPending suspiciously large (possible overflow)"
        );
    }
}

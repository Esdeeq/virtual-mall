// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MallEscrow} from "../MallEscrow.sol";
import {MockERC20}  from "../test-helpers/MockERC20.sol";

/// @dev Abstract base: shared actors, fixture deployment, and EIP-712 signing helpers.
///      No test / fuzz / invariant functions here — those live in the category files.
abstract contract MallEscrowBase is Test {
    // ── Actors ────────────────────────────────────────────────────────────────
    address internal owner   = makeAddr("owner");
    address internal alice   = makeAddr("alice");   // buyer
    address internal bob     = makeAddr("bob");     // spare address

    // Merchant receives funds; signer is a separate key that authorizes deposits.
    uint256 internal merchantPk;
    address internal merchantAddr;
    uint256 internal signerPk;
    address internal signerAddr;

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 internal constant INITIAL_TIMEOUT = 7 days;
    uint256 internal constant ALICE_BALANCE   = 100_000e6; // 100k USDC
    uint256 internal constant ORDER_AMOUNT    = 500e6;     // 500 USDC

    // ── Contracts ─────────────────────────────────────────────────────────────
    MockERC20   internal usdc;
    MallEscrow  internal escrow;

    // ── EIP-712 constants (mirror the contract) ───────────────────────────────
    bytes32 internal constant ORDER_AUTH_TYPEHASH =
        keccak256("OrderAuth(bytes32 orderId,address buyer,uint256 amount)");

    // ── Setup ─────────────────────────────────────────────────────────────────
    function setUp() public virtual {
        // Derive deterministic merchant and signer key-pairs.
        (merchantAddr, merchantPk) = makeAddrAndKey("merchant");
        (signerAddr,   signerPk)   = makeAddrAndKey("signer");

        // Deploy mock USDC.
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        // Deploy escrow (USDC is a constructor arg — no vm.etch needed).
        vm.prank(owner);
        escrow = new MallEscrow(
            address(usdc),
            merchantAddr,
            owner,
            INITIAL_TIMEOUT,
            signerAddr
        );

        // Fund alice and pre-approve the escrow.
        usdc.mint(alice, ALICE_BALANCE);
        vm.prank(alice);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ── EIP-712 helper ────────────────────────────────────────────────────────

    /// @dev Signs an OrderAuth struct with `pk_` and returns the packed signature.
    function _signOrder(
        uint256 pk_,
        bytes32 orderId,
        address buyer,
        uint256 amount
    ) internal view returns (bytes memory sig) {
        bytes32 structHash = keccak256(
            abi.encode(ORDER_AUTH_TYPEHASH, orderId, buyer, amount)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", escrow.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk_, digest);
        sig = abi.encodePacked(r, s, v);
    }

    // ── Convenience deposit ───────────────────────────────────────────────────

    /// @dev Deposits `amount` USDC from alice using a valid signer sig.
    function _deposit(bytes32 orderId, uint256 amount) internal {
        bytes memory sig = _signOrder(signerPk, orderId, alice, amount);
        vm.prank(alice);
        escrow.deposit(orderId, amount, sig);
    }

    /// @dev Deposits ORDER_AMOUNT for the given orderId.
    function _deposit(bytes32 orderId) internal {
        _deposit(orderId, ORDER_AMOUNT);
    }
}

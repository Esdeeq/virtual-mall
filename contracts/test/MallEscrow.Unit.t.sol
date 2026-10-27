// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MallEscrowBase} from "./MallEscrow.Base.t.sol";
import {MallEscrow}     from "../MallEscrow.sol";
import {Ownable}        from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable}       from "@openzeppelin/contracts/utils/Pausable.sol";

contract MallEscrowUnitTest is MallEscrowBase {

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Deployment & initialisation
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Deploy_SetsImmutables() public view {
        assertEq(address(escrow.usdc()),   address(usdc));
        assertEq(escrow.merchant(),        merchantAddr);
        assertEq(escrow.owner(),           owner);
        assertEq(escrow.timeoutSeconds(),  INITIAL_TIMEOUT);
        assertEq(escrow.totalPending(),    0);
    }

    function test_Deploy_DomainSeparatorNonZero() public view {
        assertTrue(escrow.DOMAIN_SEPARATOR() != bytes32(0));
    }

    function test_Deploy_RevertsOnZeroTimeout() public {
        vm.expectRevert(MallEscrow.InvalidTimeout.selector);
        new MallEscrow(address(usdc), merchantAddr, owner, 0, signerAddr);
    }

    function test_Deploy_RevertsOnTimeoutBelowMin() public {
        // Read the constant BEFORE arming vm.expectRevert so the static call is
        // not treated as the "next call" that must revert.
        uint256 tooLow = escrow.MIN_TIMEOUT() - 1;
        vm.expectRevert(MallEscrow.InvalidTimeout.selector);
        new MallEscrow(address(usdc), merchantAddr, owner, tooLow, signerAddr);
    }

    function test_Deploy_RevertsOnTimeoutAboveMax() public {
        uint256 tooHigh = escrow.MAX_TIMEOUT() + 1;
        vm.expectRevert(MallEscrow.InvalidTimeout.selector);
        new MallEscrow(address(usdc), merchantAddr, owner, tooHigh, signerAddr);
    }

    function test_Deploy_RevertsOnZeroUsdc() public {
        vm.expectRevert(MallEscrow.ZeroAddress.selector);
        new MallEscrow(address(0), merchantAddr, owner, INITIAL_TIMEOUT, signerAddr);
    }

    function test_Deploy_RevertsOnZeroMerchant() public {
        vm.expectRevert(MallEscrow.ZeroAddress.selector);
        new MallEscrow(address(usdc), address(0), owner, INITIAL_TIMEOUT, signerAddr);
    }

    function test_Deploy_RevertsOnZeroOwner() public {
        // OZ's Ownable base constructor fires OwnableInvalidOwner(address(0))
        // before MallEscrow's own ZeroAddress guard is reached, so the
        // observable revert is OwnableInvalidOwner, not ZeroAddress.
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableInvalidOwner.selector,
                address(0)
            )
        );
        new MallEscrow(address(usdc), merchantAddr, address(0), INITIAL_TIMEOUT, signerAddr);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. deposit — happy path
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Deposit_HappyPath() public {
        bytes32 orderId = keccak256("order-1");

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.Deposited(orderId, alice, ORDER_AMOUNT);
        _deposit(orderId);

        (
            address buyer,
            address mch,
            uint256 amount,
            uint256 claimAfter,
            MallEscrow.Status status
        ) = escrow.orders(orderId);

        assertEq(buyer,      alice);
        assertEq(mch,        merchantAddr);
        assertEq(amount,     ORDER_AMOUNT);
        assertEq(claimAfter, block.timestamp + INITIAL_TIMEOUT);
        assertEq(uint8(status), uint8(MallEscrow.Status.Pending));
        assertEq(escrow.totalPending(), ORDER_AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), ORDER_AMOUNT);
    }

    function test_Deposit_RevertsOnBadSignature() public {
        bytes32 orderId = keccak256("order-bad-sig");
        // Sign with a rogue key instead of the real merchant key.
        (, uint256 roguePk) = makeAddrAndKey("rogue");
        bytes memory badSig = _signOrder(roguePk, orderId, alice, ORDER_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(MallEscrow.InvalidOrderSignature.selector);
        escrow.deposit(orderId, ORDER_AMOUNT, badSig);
    }

    function test_Deposit_RevertsOnDuplicateOrderId() public {
        bytes32 orderId = keccak256("order-dup");
        _deposit(orderId);

        // Second deposit with the same orderId must revert.
        bytes memory sig = _signOrder(signerPk, orderId, alice, ORDER_AMOUNT);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MallEscrow.OrderAlreadyExists.selector, orderId));
        escrow.deposit(orderId, ORDER_AMOUNT, sig);
    }

    function test_Deposit_RevertsOnZeroAmount() public {
        bytes32 orderId = keccak256("order-zero");
        bytes memory sig = _signOrder(signerPk, orderId, alice, 0);
        vm.prank(alice);
        vm.expectRevert(MallEscrow.ZeroAmount.selector);
        escrow.deposit(orderId, 0, sig);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. confirmReceipt — happy path
    // ═══════════════════════════════════════════════════════════════════════════

    function test_ConfirmReceipt_ReleasesToMerchant() public {
        bytes32 orderId = keccak256("order-cr");
        _deposit(orderId);

        uint256 merchantBefore = usdc.balanceOf(merchantAddr);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.Released(orderId, merchantAddr, ORDER_AMOUNT);

        vm.prank(alice);
        escrow.confirmReceipt(orderId);

        assertEq(usdc.balanceOf(merchantAddr), merchantBefore + ORDER_AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalPending(), 0);

        (, , , , MallEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(MallEscrow.Status.Released));
    }

    function test_ConfirmReceipt_RevertsIfNotBuyer() public {
        bytes32 orderId = keccak256("order-cr-notbuyer");
        _deposit(orderId);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(MallEscrow.NotBuyer.selector, orderId));
        escrow.confirmReceipt(orderId);
    }

    function test_ConfirmReceipt_RevertsOnNonPendingOrder() public {
        bytes32 orderId = keccak256("order-cr-notpending");
        _deposit(orderId);

        vm.prank(alice);
        escrow.confirmReceipt(orderId); // now Released

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MallEscrow.OrderNotPending.selector, orderId));
        escrow.confirmReceipt(orderId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. claim — happy path + reverts
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Claim_HappyPathAfterTimeout() public {
        bytes32 orderId = keccak256("order-claim");
        _deposit(orderId);

        // Warp past the claimAfter timestamp.
        skip(INITIAL_TIMEOUT + 1);

        uint256 merchantBefore = usdc.balanceOf(merchantAddr);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.Claimed(orderId, merchantAddr, ORDER_AMOUNT);

        vm.prank(merchantAddr);
        escrow.claim(orderId);

        assertEq(usdc.balanceOf(merchantAddr), merchantBefore + ORDER_AMOUNT);
        assertEq(escrow.totalPending(), 0);

        (, , , , MallEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(MallEscrow.Status.Released));
    }

    function test_Claim_RevertsBeforeTimeout() public {
        bytes32 orderId = keccak256("order-claim-early");
        _deposit(orderId);

        // Do NOT warp — we are still before claimAfter.
        vm.prank(merchantAddr);
        vm.expectRevert(abi.encodeWithSelector(MallEscrow.TimeoutNotReached.selector, orderId));
        escrow.claim(orderId);
    }

    function test_Claim_RevertsIfNotMerchant() public {
        bytes32 orderId = keccak256("order-claim-notmerchant");
        _deposit(orderId);

        skip(INITIAL_TIMEOUT + 1);

        vm.prank(bob);
        vm.expectRevert(MallEscrow.NotMerchant.selector);
        escrow.claim(orderId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. refund — happy path + reverts
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Refund_ReturnsToBuyer() public {
        bytes32 orderId = keccak256("order-refund");
        _deposit(orderId);

        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.Refunded(orderId, alice, ORDER_AMOUNT);

        vm.prank(owner);
        escrow.refund(orderId);

        assertEq(usdc.balanceOf(alice), aliceBefore + ORDER_AMOUNT);
        assertEq(escrow.totalPending(), 0);

        (, , , , MallEscrow.Status status) = escrow.orders(orderId);
        assertEq(uint8(status), uint8(MallEscrow.Status.Refunded));
    }

    function test_Refund_RevertsIfNotOwner() public {
        bytes32 orderId = keccak256("order-refund-notowner");
        _deposit(orderId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        escrow.refund(orderId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. rescueOrder
    // ═══════════════════════════════════════════════════════════════════════════

    function test_RescueOrder_ToBuyer() public {
        bytes32 orderId = keccak256("order-rescue-buyer");
        _deposit(orderId);

        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.OrderRescued(orderId, alice, ORDER_AMOUNT);

        vm.prank(owner);
        escrow.rescueOrder(orderId, alice);

        assertEq(usdc.balanceOf(alice), aliceBefore + ORDER_AMOUNT);
        assertEq(escrow.totalPending(), 0);
    }

    function test_RescueOrder_ToMerchant() public {
        bytes32 orderId = keccak256("order-rescue-merchant");
        _deposit(orderId);

        uint256 merchantBefore = usdc.balanceOf(merchantAddr);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MallEscrow.OrderRescued(orderId, merchantAddr, ORDER_AMOUNT);

        vm.prank(owner);
        escrow.rescueOrder(orderId, merchantAddr);

        assertEq(usdc.balanceOf(merchantAddr), merchantBefore + ORDER_AMOUNT);
        assertEq(escrow.totalPending(), 0);
    }

    function test_RescueOrder_RevertsOnInvalidRecipient() public {
        bytes32 orderId = keccak256("order-rescue-invalid");
        _deposit(orderId);

        vm.prank(owner);
        vm.expectRevert(MallEscrow.InvalidRescueRecipient.selector);
        escrow.rescueOrder(orderId, bob);
    }

    function test_RescueOrder_RevertsIfNotOwner() public {
        bytes32 orderId = keccak256("order-rescue-notowner");
        _deposit(orderId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        escrow.rescueOrder(orderId, alice);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. pause / unpause
    // ═══════════════════════════════════════════════════════════════════════════

    function test_Pause_BlocksDeposit() public {
        vm.prank(owner);
        escrow.pause();

        bytes32 orderId = keccak256("order-paused");
        bytes memory sig = _signOrder(signerPk, orderId, alice, ORDER_AMOUNT);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.deposit(orderId, ORDER_AMOUNT, sig);
    }

    function test_Unpause_RestoresDeposit() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        escrow.unpause();

        // Should succeed now.
        bytes32 orderId = keccak256("order-unpaused");
        _deposit(orderId);

        assertEq(escrow.totalPending(), ORDER_AMOUNT);
    }

    function test_Pause_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        escrow.pause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. renounceOwnership
    // ═══════════════════════════════════════════════════════════════════════════

    function test_RenounceOwnership_RevertsWhilePaused() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        vm.expectRevert(MallEscrow.RenounceWhilePaused.selector);
        escrow.renounceOwnership();
    }

    function test_RenounceOwnership_SucceedsWhenUnpaused() public {
        vm.prank(owner);
        escrow.renounceOwnership();
        // Ownable2Step: renounce is instant for the current owner.
        assertEq(escrow.owner(), address(0));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. setMerchant
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetMerchant_UpdatesMerchant() public {
        address newMerchant = makeAddr("newMerchant");

        vm.expectEmit(true, true, false, false, address(escrow));
        emit MallEscrow.MerchantUpdated(merchantAddr, newMerchant);

        vm.prank(owner);
        escrow.setMerchant(newMerchant);

        assertEq(escrow.merchant(), newMerchant);
    }

    function test_SetMerchant_RevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(MallEscrow.ZeroAddress.selector);
        escrow.setMerchant(address(0));
    }

    function test_SetMerchant_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        escrow.setMerchant(bob);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. setTimeout
    // ═══════════════════════════════════════════════════════════════════════════

    function test_SetTimeout_UpdatesTimeout() public {
        uint256 newTimeout = 14 days;

        vm.expectEmit(false, false, false, true, address(escrow));
        emit MallEscrow.TimeoutUpdated(INITIAL_TIMEOUT, newTimeout);

        vm.prank(owner);
        escrow.setTimeout(newTimeout);

        assertEq(escrow.timeoutSeconds(), newTimeout);
    }

    function test_SetTimeout_RevertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        escrow.setTimeout(14 days);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. Fuzz — deposit amount
    // ═══════════════════════════════════════════════════════════════════════════

    function testFuzz_Deposit_TotalPendingAccumulates(uint256 amount) public {
        amount = bound(amount, 1, ALICE_BALANCE);

        bytes32 orderId = keccak256("fuzz-deposit");
        bytes memory sig = _signOrder(signerPk, orderId, alice, amount);

        uint256 pendingBefore = escrow.totalPending();

        vm.prank(alice);
        escrow.deposit(orderId, amount, sig);

        assertEq(escrow.totalPending(), pendingBefore + amount);
    }

    function testFuzz_Deposit_EscrowBalanceMatchesAmount(uint256 amount) public {
        amount = bound(amount, 1, ALICE_BALANCE);

        bytes32 orderId = keccak256("fuzz-bal");
        bytes memory sig = _signOrder(signerPk, orderId, alice, amount);

        vm.prank(alice);
        escrow.deposit(orderId, amount, sig);

        assertEq(usdc.balanceOf(address(escrow)), amount);
    }

    function testFuzz_ConfirmReceipt_MerchantGetsExactAmount(uint256 amount) public {
        amount = bound(amount, 1, ALICE_BALANCE);

        bytes32 orderId = keccak256("fuzz-confirm");
        bytes memory sig = _signOrder(signerPk, orderId, alice, amount);

        vm.prank(alice);
        escrow.deposit(orderId, amount, sig);

        uint256 merchantBefore = usdc.balanceOf(merchantAddr);

        vm.prank(alice);
        escrow.confirmReceipt(orderId);

        assertEq(usdc.balanceOf(merchantAddr), merchantBefore + amount);
        assertEq(escrow.totalPending(), 0);
    }
}

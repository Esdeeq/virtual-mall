// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MallEscrow is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        NonExistent,
        Pending,
        Released,
        Refunded
    }

    struct Order {
        address buyer;
        address merchant;
        uint256 amount;
        uint256 claimAfter;
        Status status;
    }

    error ZeroAddress();
    error ZeroAmount();
    error OrderAlreadyExists(bytes32 orderId);
    error OrderNotPending(bytes32 orderId);
    error NotBuyer(bytes32 orderId);
    error NotMerchant();
    error InvalidRescueRecipient();
    error InvalidOrderSignature();
    error InvalidTimeout();
    error TimeoutNotReached(bytes32 orderId);
    error NoMerchantSet();
    error RenounceWhilePaused();

    event Deposited(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event Released(bytes32 indexed orderId, address indexed merchant, uint256 amount);
    event Claimed(bytes32 indexed orderId, address indexed merchant, uint256 amount);
    event Refunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event OrderRescued(bytes32 indexed orderId, address indexed newRecipient, uint256 amount);
    event MerchantUpdated(address indexed oldMerchant, address indexed newMerchant);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);

    mapping(bytes32 => Order) public orders;
    address public merchant;
    address public signer;
    uint256 public timeoutSeconds;
    IERC20 public immutable usdc;
    uint256 public totalPending;
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ORDER_AUTH_TYPEHASH = keccak256("OrderAuth(bytes32 orderId,address buyer,uint256 amount)");

    uint256 public constant MIN_TIMEOUT = 1 hours;
    uint256 public constant MAX_TIMEOUT = 90 days;

    /// @notice Creates a new escrow contract for USDC orders.
    /// @param usdc_ The USDC ERC-20 token address.
    /// @param merchant_ The initial merchant address that receives released funds.
    /// @param initialOwner The initial owner for Ownable2Step administration.
    /// @param timeoutSeconds_ The timeout in seconds after deposit before merchant claim is allowed.
    /// @param signer_ The initial signer address that authorizes orders.
    constructor(address usdc_, address merchant_, address initialOwner, uint256 timeoutSeconds_, address signer_) Ownable(initialOwner) {
        if (usdc_ == address(0) || merchant_ == address(0) || initialOwner == address(0)) revert ZeroAddress();
        if (signer_ == address(0)) revert ZeroAddress();
        if (timeoutSeconds_ < MIN_TIMEOUT || timeoutSeconds_ > MAX_TIMEOUT) revert InvalidTimeout();

        usdc = IERC20(usdc_);
        merchant = merchant_;
        signer = signer_;
        timeoutSeconds = timeoutSeconds_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("MallEscrow")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Deposits USDC into escrow for a unique order identifier.
    /// @param orderId Unique order identifier.
    /// @param amount Intended USDC transfer amount from buyer.
    /// @param sig Merchant EIP-712 signature authorizing this order.
    function deposit(bytes32 orderId, uint256 amount, bytes calldata sig) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (merchant == address(0)) revert NoMerchantSet();

        Order storage order = orders[orderId];
        if (order.status != Status.NonExistent) revert OrderAlreadyExists(orderId);

        bytes32 structHash = keccak256(abi.encode(ORDER_AUTH_TYPEHASH, orderId, msg.sender, amount));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (ECDSA.recover(digest, sig) != signer) revert InvalidOrderSignature();

        uint256 balanceBefore = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualReceived = usdc.balanceOf(address(this)) - balanceBefore;

        if (actualReceived == 0) revert ZeroAmount();

        orders[orderId] = Order({
            buyer: msg.sender,
            merchant: merchant,
            amount: actualReceived,
            claimAfter: block.timestamp + timeoutSeconds,
            status: Status.Pending
        });

        totalPending += actualReceived;

        emit Deposited(orderId, msg.sender, actualReceived);
    }

    /// @notice Confirms receipt by the buyer and releases escrowed USDC to the merchant.
    /// @param orderId The order identifier to release.
    function confirmReceipt(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (order.status != Status.Pending) revert OrderNotPending(orderId);
        if (msg.sender != order.buyer) revert NotBuyer(orderId);

        uint256 amount = order.amount;
        address currentMerchant = order.merchant;

        order.status = Status.Released;
        totalPending -= amount;

        usdc.safeTransfer(currentMerchant, amount);

        emit Released(orderId, currentMerchant, amount);
    }

    /// @notice Claims escrowed USDC to merchant after timeout has elapsed.
    /// @param orderId The order identifier to claim.
    function claim(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (msg.sender != order.merchant) revert NotMerchant();
        if (order.status != Status.Pending) revert OrderNotPending(orderId);
        if (block.timestamp < order.claimAfter) revert TimeoutNotReached(orderId);

        uint256 amount = order.amount;
        address currentMerchant = order.merchant;

        order.status = Status.Released;
        totalPending -= amount;

        usdc.safeTransfer(currentMerchant, amount);

        emit Claimed(orderId, currentMerchant, amount);
    }

    /// @notice Refunds escrowed USDC back to the buyer for a pending order.
    /// @param orderId The order identifier to refund.
    function refund(bytes32 orderId) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        if (order.status != Status.Pending) revert OrderNotPending(orderId);

        address buyer = order.buyer;
        uint256 amount = order.amount;

        order.status = Status.Refunded;
        totalPending -= amount;

        usdc.safeTransfer(buyer, amount);

        emit Refunded(orderId, buyer, amount);
    }

    /// @notice Owner rescue for orders whose normal payout recipient is blocklisted on Arc.
    /// @dev Only callable by owner. Redirects a pending order's payout to `newRecipient`
    ///      and immediately releases the funds. Intended for cases where safeTransfer
    ///      to the snapshotted merchant or buyer would revert due to a USDC blocklist entry.
    /// @param orderId The pending order to rescue.
    /// @param newRecipient The unblocked address to receive the funds.
    function rescueOrder(bytes32 orderId, address newRecipient) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        if (order.status != Status.Pending) revert OrderNotPending(orderId);
        if (newRecipient != order.buyer && newRecipient != order.merchant) revert InvalidRescueRecipient();

        uint256 amount = order.amount;
        order.status = Status.Released;
        totalPending -= amount;

        usdc.safeTransfer(newRecipient, amount);

        emit OrderRescued(orderId, newRecipient, amount);
    }

    /// @notice Updates merchant address used for releases and claims.
    /// @param newMerchant New merchant address.
    function setMerchant(address newMerchant) external onlyOwner {
        if (newMerchant == address(0)) revert ZeroAddress();

        address oldMerchant = merchant;
        merchant = newMerchant;

        emit MerchantUpdated(oldMerchant, newMerchant);
    }

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    /// @notice Updates the timeout window used for merchant claims.
    /// @param newTimeout New timeout value in seconds.
    function setTimeout(uint256 newTimeout) external onlyOwner {
        require(newTimeout >= MIN_TIMEOUT && newTimeout <= MAX_TIMEOUT);

        uint256 oldTimeout = timeoutSeconds;
        timeoutSeconds = newTimeout;

        emit TimeoutUpdated(oldTimeout, newTimeout);
    }

    /// @notice Pauses new deposits.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses deposits.
    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public override onlyOwner {
        if (paused()) revert RenounceWhilePaused();
        super.renounceOwnership();
    }
}

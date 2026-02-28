// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MicroBounty
 * @notice A multi-currency bounty payment platform for the Polkadot ecosystem.
 *         Supports native DOT and ERC20 stablecoins (USDC, USDT).
 * @dev Deployed on Polkadot Hub EVM. Uses OpenZeppelin ReentrancyGuard and SafeERC20.
 */
contract MicroBounty is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================
    //  Constants
    // =========================================================

    /// @notice Minimum reward for native DOT bounties (100 DOT, 10 decimals)
    uint256 public constant MIN_REWARD_DOT = 100e10;

    /// @notice Minimum reward for stablecoin bounties (100 USDC/USDT, 6 decimals)
    uint256 public constant MIN_REWARD_STABLE = 100e6;

    /// @notice Maximum length for bounty title
    uint256 public constant MAX_TITLE_LENGTH = 100;

    /// @notice Maximum length for bounty description
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;

    /// @notice Maximum length for submission notes
    uint256 public constant MAX_NOTES_LENGTH = 200;

    // =========================================================
    //  Enums
    // =========================================================

    enum BountyStatus {
        OPEN,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    enum Category {
        DEVELOPMENT, // 0
        DESIGN,      // 1
        CONTENT,     // 2
        BUG_FIX,     // 3
        OTHER        // 4
    }

    // =========================================================
    //  Structs
    // =========================================================

    struct Bounty {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 reward;
        /// @dev address(0) = native DOT; any other address = ERC20 token
        address paymentToken;
        BountyStatus status;
        address hunter;
        string proofUrl;
        string submissionNotes;
        uint256 createdAt;
        uint256 submittedAt;
        uint256 completedAt;
        uint8 category;
    }

    struct UserStats {
        uint256 bountiesCreated;
        uint256 bountiesCompleted;
        uint256 totalSpentDOT;
        uint256 totalSpentStable;
        uint256 totalEarnedDOT;
        uint256 totalEarnedStable;
    }

    struct PlatformStats {
        uint256 totalBounties;
        uint256 activeBounties;
        uint256 completedBounties;
        uint256 cancelledBounties;
        uint256 totalValueLockedDOT;
        uint256 totalValueLockedStable;
        uint256 totalPaidOutDOT;
        uint256 totalPaidOutStable;
    }

    // =========================================================
    //  State Variables
    // =========================================================

    /// @notice Auto-incrementing bounty ID counter (starts at 1)
    uint256 public bountyCount;

    /// @notice All bounties by ID
    mapping(uint256 => Bounty) public bounties;

    /// @notice Bounty IDs created by each user
    mapping(address => uint256[]) public userBounties;

    /// @notice Bounty IDs submitted to by each user
    mapping(address => uint256[]) public userSubmissions;

    /// @notice Per-user statistics
    mapping(address => UserStats) public userStats;

    /// @notice Whether a token address is approved for use as payment
    mapping(address => bool) public supportedTokens;

    /// @notice Ordered list of all supported token addresses
    address[] public tokenList;

    /// @notice Platform-wide aggregate statistics
    PlatformStats public platformStats;

    // =========================================================
    //  Events
    // =========================================================

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 reward,
        address paymentToken,
        uint8 category
    );

    event WorkSubmitted(
        uint256 indexed bountyId,
        address indexed hunter,
        string proofUrl,
        uint256 timestamp
    );

    event BountyCompleted(
        uint256 indexed bountyId,
        address indexed hunter,
        uint256 reward,
        address paymentToken,
        uint256 timestamp
    );

    event BountyCancelled(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 refund,
        address paymentToken,
        uint256 timestamp
    );

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    // =========================================================
    //  Constructor
    // =========================================================

    /**
     * @param _initialTokens List of ERC20 token addresses to whitelist on deploy
     *                       (typically USDC and USDT on Polkadot Hub).
     */
    constructor(address[] memory _initialTokens) {
        for (uint256 i = 0; i < _initialTokens.length; i++) {
            require(_initialTokens[i] != address(0), "Token cannot be zero address");
            _addToken(_initialTokens[i]);
        }
    }

    // =========================================================
    //  Modifiers
    // =========================================================

    modifier onlyBountyCreator(uint256 _bountyId) {
        require(bounties[_bountyId].creator == msg.sender, "Only creator can perform this action");
        _;
    }

    modifier bountyExists(uint256 _bountyId) {
        require(_bountyId > 0 && _bountyId <= bountyCount, "Bounty does not exist");
        _;
    }

    // =========================================================
    //  Core Functions
    // =========================================================

    /**
     * @notice Create a new bounty with DOT or an approved ERC20 token as reward.
     * @param _title       Short title for the task (1-100 chars).
     * @param _description Detailed description of the task (1-500 chars).
     * @param _reward      Reward amount in the token's native decimals.
     * @param _paymentToken address(0) for native DOT, or an approved ERC20 address.
     * @param _category    Category index from the Category enum (0-4).
     * @return bountyId    The ID of the newly created bounty.
     */
    function createBounty(
        string memory _title,
        string memory _description,
        uint256 _reward,
        address _paymentToken,
        uint8 _category
    ) external payable returns (uint256 bountyId) {
        // --- Input validation ---
        require(
            bytes(_title).length > 0 && bytes(_title).length <= MAX_TITLE_LENGTH,
            "Title must be 1-100 characters"
        );
        require(
            bytes(_description).length > 0 && bytes(_description).length <= MAX_DESCRIPTION_LENGTH,
            "Description must be 1-500 characters"
        );
        require(_category <= uint8(Category.OTHER), "Invalid category");

        // --- Payment handling ---
        if (_paymentToken == address(0)) {
            // Native DOT bounty
            require(msg.value == _reward, "msg.value must equal reward amount");
            require(_reward >= MIN_REWARD_DOT, "Reward below minimum (0.01 DOT)");
            platformStats.totalValueLockedDOT += _reward;
        } else {
            // ERC20 token bounty
            require(supportedTokens[_paymentToken], "Token is not supported");
            require(msg.value == 0, "Do not send DOT when using an ERC20 token");
            require(_reward >= MIN_REWARD_STABLE, "Reward below minimum (1 stablecoin unit)");

            IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _reward);
            platformStats.totalValueLockedStable += _reward;
        }

        // --- Create bounty record ---
        bountyCount++;
        bountyId = bountyCount;

        bounties[bountyId] = Bounty({
            id: bountyId,
            creator: msg.sender,
            title: _title,
            description: _description,
            reward: _reward,
            paymentToken: _paymentToken,
            status: BountyStatus.OPEN,
            hunter: address(0),
            proofUrl: "",
            submissionNotes: "",
            createdAt: block.timestamp,
            submittedAt: 0,
            completedAt: 0,
            category: _category
        });

        // --- Update mappings & stats ---
        userBounties[msg.sender].push(bountyId);
        userStats[msg.sender].bountiesCreated++;

        if (_paymentToken == address(0)) {
            userStats[msg.sender].totalSpentDOT += _reward;
        } else {
            userStats[msg.sender].totalSpentStable += _reward;
        }

        platformStats.totalBounties++;
        platformStats.activeBounties++;

        emit BountyCreated(bountyId, msg.sender, _reward, _paymentToken, _category);
    }

    /**
     * @notice Submit proof of completed work for an OPEN bounty.
     *         The bounty moves to IN_PROGRESS and the caller becomes the hunter.
     * @param _bountyId The ID of the bounty to submit work for.
     * @param _proofUrl URL pointing to the proof of work (e.g. GitHub PR).
     * @param _notes    Optional additional notes (max 200 chars).
     */
    function submitWork(
        uint256 _bountyId,
        string memory _proofUrl,
        string memory _notes
    ) external bountyExists(_bountyId) {
        Bounty storage bounty = bounties[_bountyId];

        require(bounty.status == BountyStatus.OPEN, "Bounty is not open");
        require(bounty.creator != msg.sender, "Creator cannot submit to their own bounty");
        require(bytes(_proofUrl).length > 0, "Proof URL is required");
        require(bytes(_notes).length <= MAX_NOTES_LENGTH, "Notes exceed 200 character limit");

        bounty.status = BountyStatus.IN_PROGRESS;
        bounty.hunter = msg.sender;
        bounty.proofUrl = _proofUrl;
        bounty.submissionNotes = _notes;
        bounty.submittedAt = block.timestamp;

        userSubmissions[msg.sender].push(_bountyId);

        emit WorkSubmitted(_bountyId, msg.sender, _proofUrl, block.timestamp);
    }

    /**
     * @notice Approve the submitted work and release payment to the hunter.
     *         Only the bounty creator can call this on an IN_PROGRESS bounty.
     * @param _bountyId The ID of the bounty to approve.
     */
    function approveBounty(uint256 _bountyId)
        external
        nonReentrant
        bountyExists(_bountyId)
        onlyBountyCreator(_bountyId)
    {
        Bounty storage bounty = bounties[_bountyId];
        require(bounty.status == BountyStatus.IN_PROGRESS, "Bounty must be IN_PROGRESS to approve");

        // --- Update state before transfer (checks-effects-interactions) ---
        bounty.status = BountyStatus.COMPLETED;
        bounty.completedAt = block.timestamp;

        platformStats.activeBounties--;
        platformStats.completedBounties++;
        userStats[bounty.hunter].bountiesCompleted++;

        // --- Transfer payment ---
        if (bounty.paymentToken == address(0)) {
            // Native DOT
            platformStats.totalValueLockedDOT -= bounty.reward;
            platformStats.totalPaidOutDOT += bounty.reward;
            userStats[bounty.hunter].totalEarnedDOT += bounty.reward;

            (bool success, ) = bounty.hunter.call{value: bounty.reward}("");
            require(success, "DOT transfer to hunter failed");
        } else {
            // ERC20 token
            platformStats.totalValueLockedStable -= bounty.reward;
            platformStats.totalPaidOutStable += bounty.reward;
            userStats[bounty.hunter].totalEarnedStable += bounty.reward;

            IERC20(bounty.paymentToken).safeTransfer(bounty.hunter, bounty.reward);
        }

        emit BountyCompleted(
            _bountyId,
            bounty.hunter,
            bounty.reward,
            bounty.paymentToken,
            block.timestamp
        );
    }

    /**
     * @notice Cancel an OPEN bounty and refund the full reward to the creator.
     *         Cannot be called once work has been submitted (status != OPEN).
     * @param _bountyId The ID of the bounty to cancel.
     */
    function cancelBounty(uint256 _bountyId)
        external
        nonReentrant
        bountyExists(_bountyId)
        onlyBountyCreator(_bountyId)
    {
        Bounty storage bounty = bounties[_bountyId];
        require(bounty.status == BountyStatus.OPEN, "Only OPEN bounties can be cancelled");

        // --- Update state before transfer ---
        bounty.status = BountyStatus.CANCELLED;

        platformStats.activeBounties--;
        platformStats.cancelledBounties++;

        // --- Refund payment ---
        if (bounty.paymentToken == address(0)) {
            // Native DOT refund
            platformStats.totalValueLockedDOT -= bounty.reward;

            (bool success, ) = bounty.creator.call{value: bounty.reward}("");
            require(success, "DOT refund to creator failed");
        } else {
            // ERC20 token refund
            platformStats.totalValueLockedStable -= bounty.reward;

            IERC20(bounty.paymentToken).safeTransfer(bounty.creator, bounty.reward);
        }

        emit BountyCancelled(
            _bountyId,
            bounty.creator,
            bounty.reward,
            bounty.paymentToken,
            block.timestamp
        );
    }

    // =========================================================
    //  View Functions — Single Bounty
    // =========================================================

    /**
     * @notice Retrieve all data for a single bounty.
     */
    function getBounty(uint256 _bountyId)
        external
        view
        bountyExists(_bountyId)
        returns (Bounty memory)
    {
        return bounties[_bountyId];
    }

    /**
     * @notice Total number of bounties ever created.
     */
    function getBountyCount() external view returns (uint256) {
        return bountyCount;
    }

    // =========================================================
    //  View Functions — Filtered Lists
    // =========================================================

    /**
     * @notice Return all bounty IDs that match a given status.
     */
    function getBountiesByStatus(BountyStatus _status)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = 0;
        for (uint256 i = 1; i <= bountyCount; i++) {
            if (bounties[i].status == _status) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= bountyCount; i++) {
            if (bounties[i].status == _status) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }

    /**
     * @notice Return all bounty IDs created by a specific address.
     */
    function getBountiesByCreator(address _creator)
        external
        view
        returns (uint256[] memory)
    {
        return userBounties[_creator];
    }

    /**
     * @notice Return all bounty IDs that use a specific payment token.
     * @dev    Pass address(0) to query native DOT bounties.
     */
    function getBountiesByToken(address _token)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = 0;
        for (uint256 i = 1; i <= bountyCount; i++) {
            if (bounties[i].paymentToken == _token) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= bountyCount; i++) {
            if (bounties[i].paymentToken == _token) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }

    // =========================================================
    //  View Functions — User Data
    // =========================================================

    /**
     * @notice All bounty IDs created by a user.
     */
    function getUserBounties(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userBounties[_user];
    }

    /**
     * @notice All bounty IDs a user has submitted work for.
     */
    function getUserSubmissions(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userSubmissions[_user];
    }

    /**
     * @notice Aggregate statistics for a specific user.
     */
    function getUserStats(address _user)
        external
        view
        returns (UserStats memory)
    {
        return userStats[_user];
    }

    // =========================================================
    //  View Functions — Analytics
    // =========================================================

    /**
     * @notice Platform-wide aggregate statistics.
     */
    function getPlatformStats() external view returns (PlatformStats memory) {
        return platformStats;
    }

    /**
     * @notice Convenience helper: returns the four top-level platform counters.
     */
    function getStatistics()
        external
        view
        returns (
            uint256 totalBounties,
            uint256 activeBounties,
            uint256 completedBounties,
            uint256 cancelledBounties
        )
    {
        return (
            platformStats.totalBounties,
            platformStats.activeBounties,
            platformStats.completedBounties,
            platformStats.cancelledBounties
        );
    }

    /**
     * @notice Convenience helper: per-user summary for analytics dashboard.
     */
    function getUserStatistics(address _user)
        external
        view
        returns (
            uint256 created,
            uint256 completed,
            uint256 totalEarnedDOT,
            uint256 totalEarnedStable
        )
    {
        UserStats storage s = userStats[_user];
        return (s.bountiesCreated, s.bountiesCompleted, s.totalEarnedDOT, s.totalEarnedStable);
    }

    /**
     * @notice Number of bounties denominated in each supported currency.
     * @dev    DOT is identified by address(0); counts other tokens individually.
     */
    function getCurrencyStats()
        external
        view
        returns (
            uint256 dotBounties,
            uint256[] memory tokenBounties,
            address[] memory tokens
        )
    {
        tokens = tokenList;
        tokenBounties = new uint256[](tokens.length);

        for (uint256 i = 1; i <= bountyCount; i++) {
            address t = bounties[i].paymentToken;
            if (t == address(0)) {
                dotBounties++;
            } else {
                for (uint256 j = 0; j < tokens.length; j++) {
                    if (tokens[j] == t) {
                        tokenBounties[j]++;
                        break;
                    }
                }
            }
        }
    }

    // =========================================================
    //  View Functions — Token Management
    // =========================================================

    /**
     * @notice List of all whitelisted ERC20 token addresses.
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @notice Whether a given token is approved for bounty payments.
     */
    function isTokenSupported(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }

    // =========================================================
    //  Internal Helpers
    // =========================================================

    function _addToken(address _token) internal {
        if (!supportedTokens[_token]) {
            supportedTokens[_token] = true;
            tokenList.push(_token);
            emit TokenAdded(_token);
        }
    }

    // =========================================================
    //  Fallback / Receive
    // =========================================================

    /// @dev Reject plain ETH/DOT transfers that are not part of createBounty.
    receive() external payable {
        revert("Use createBounty to fund bounties");
    }
}
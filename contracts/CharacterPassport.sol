// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Cast Character Passport — creators own their AI persona on X Layer.
/// Each passport locks a character's reference hash; every render can prove it
/// matches the same owned character.
contract CharacterPassport is ERC721 {
    struct Passport {
        bytes32 referenceHash;
        uint64 createdAt;
        string metadataURI;
    }

    mapping(uint256 => Passport) public passports;
    uint256 public nextId = 1;
    address public minter; // the Cast server (relayer)

    event PassportMinted(uint256 indexed id, address indexed owner, bytes32 referenceHash);

    constructor() ERC721("Cast Character Passport", "CAST") {
        minter = msg.sender;
    }

    function setMinter(address m) external {
        require(msg.sender == minter, "only minter");
        minter = m;
    }

    function mint(address owner, bytes32 referenceHash, string calldata metadataURI)
        external
        returns (uint256 id)
    {
        require(msg.sender == minter, "only minter");
        id = nextId++;
        _safeMint(owner, id);
        passports[id] = Passport(referenceHash, uint64(block.timestamp), metadataURI);
        emit PassportMinted(id, owner, referenceHash);
    }

    function verify(uint256 id, bytes32 referenceHash) external view returns (bool) {
        return passports[id].referenceHash == referenceHash;
    }
}

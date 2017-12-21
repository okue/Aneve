pragma solidity ^0.4.11;

import './Aneve.sol';

contract AneveHandler {

  mapping(bytes32 => Aneve) public aneves;

  /////////////////////////////// Create Aneve ////////////////////////////////////////////

  function createAneve(bytes32 _vc) returns (bool) {
    return createAnevePrivate(msg.sender, _vc);
  }

  function createAneveWithSign(bytes32 _vc, bytes _clientsign) returns (bool) {
    bytes32 hash = calcEnvHash('createAneve');
    hash = sha3(hash, _vc);
    address endUserAddr = recoverAddress(hash, _clientsign);

    return createAnevePrivate(endUserAddr, _vc);
  }

  function createAnevePrivate(address _endUserAddr, bytes32 _vc) private returns (bool) {
    if (address(aneves[_vc]) != 0)
      return false;
    aneves[_vc] = new Aneve(13, 6);
    return true;
  }
  /////////////////////////////// Remove Aneve ////////////////////////////////////////////


  /////////////////////////////// Authentication ////////////////////////////////////////////

  function calcEnvHash(bytes32 _functionName) internal constant returns (bytes32) {
    bytes32 h = sha3(this);
    h = sha3(h, _functionName);
    return h;
  }

  function recoverAddress(bytes32 _hash, bytes _sign) internal constant returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;
    if (_sign.length != 65) throw;
    assembly {
      r := mload(add(_sign, 32))
      s := mload(add(_sign, 64))
      v := byte(0, mload(add(_sign, 96)))
    }
    if (v < 27) v += 27;
    if (v != 27 && v != 28) throw;
    address recAddr = ecrecover(_hash, v, r, s);
    if (recAddr == 0) throw;
    return recAddr;
  }

}

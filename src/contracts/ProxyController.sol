pragma solidity ^0.4.8;

import './lib/VersionContract.sol';
import './Aneve.sol';
import './AneveHandler.sol';

contract ProxyController is VersionContract {


  AneveHandler public anevehandler;

  function ProxyController(ContractNameService _cns,
                           AneveHandler _anevehandler) VersionContract(_cns, "ProxyController") {
    anevehandler = _anevehandler;
  }

  function modulo(bytes32 _vc) constant returns (uint) {
    return Aneve(anevehandler.aneves(_vc)).modulo();
  }

  function generator(bytes32 _vc) constant returns (uint) {
    return Aneve(anevehandler.aneves(_vc)).generator();
  }

  function participants(bytes32 _vc) constant returns (uint) {
    return Aneve(anevehandler.aneves(_vc)).participants();
  }

  function addrList(bytes32 _vc, uint _x) constant returns (address) {
    return Aneve(anevehandler.aneves(_vc)).addrList(_x);
  }

  function voters(bytes32 _vc, address _x) constant returns (uint,uint,bool) {
    return Aneve(anevehandler.aneves(_vc)).voters(_x);
  }

  function createAneve(bytes _sign, bytes32 _vc, bytes _clientsign) {
    anevehandler.createAneveWithSign(_vc, _clientsign);
  }

  function aneveAddr(bytes32 _vc) constant returns (address) {
    return address(anevehandler.aneves(_vc));
  }

  function resetAddrList(bytes _sign, bytes32 _vc, bytes _clientsign) {
    assert(Aneve(anevehandler.aneves(_vc)).resetAddrListWithSign(_clientsign));
  }

  function setPubKey(bytes _sign,
                     bytes32 _vc,
                     address _endUserAddr,
                     uint _pubkey,
                     uint _zkp_g,
                     uint _zkp_s,
                     bytes _clientsign) {
    assert(Aneve(anevehandler.aneves(_vc)).setPubKeyWithSign(
                                            _endUserAddr,
                                            _pubkey,
                                            _zkp_g,
                                            _zkp_s,
                                            _clientsign));
  }

  function calcMagicKey(bytes32 _vc, address _endUserAddr) constant returns (uint, uint) {
    return Aneve(anevehandler.aneves(_vc)).calcMagicKey(_endUserAddr);
  }

  function vote(bytes _sign,
                bytes32 _vc,
                address _endUserAddr,
                uint _bal,
                uint a1,
                uint a2,
                uint b1,
                uint b2,
                uint d1,
                uint d2,
                uint r1,
                uint r2,
                bytes _clientsign) {
    assert(Aneve(anevehandler.aneves(_vc)).voteWithSign(
                                            _endUserAddr,
                                            _bal,
                                            a1,
                                            a2,
                                            b1,
                                            b2,
                                            d1,
                                            d2,
                                            r1,
                                            r2,
                                            _clientsign));
  }

  function count(bytes32 _vc) constant returns (uint) {
    return Aneve(anevehandler.aneves(_vc)).count();
  }


}

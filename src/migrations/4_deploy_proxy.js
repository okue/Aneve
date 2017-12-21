
var CNS   = artifacts.require('./ContractNameService.sol')
var Proxy = artifacts.require('./ProxyController.sol')
var AneveHandler = artifacts.require('./AneveHandler.sol')

module.exports = function(deployer) {
  deployer.deploy(Proxy, CNS.address, AneveHandler.address).then(function() {
    return CNS.deployed()
  }).then(function(instance) {
    console.log( JSON.stringify(Proxy.abi) )
    return instance.setContract('ProxyController', 1, Proxy.address, Proxy.address)
  })
}

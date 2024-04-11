import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PublicResolverABI from './PublicResolverABI.json';
import './App.css';
import ensRegistry from './ens-registry.json';
import ethRegistrarControllerABI from './ethRegistrarControllerABI.json';

const App = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [ensName, setENSName] = useState('');
  const [network, setNetwork] = useState('');
  const [balance, setBalance] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [search , setSearch] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [disableCommit, setdisableCommit] = useState(false);
  const [showRegister, setshowRegister] = useState(false);
  const [showCommit, setshowCommit] = useState(true);

  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };
  
  useEffect(() => {
    const fetchENSName = async () => {
      try {
        if (!window.ethereum) return;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);
        const network = await provider.getNetwork();
        const networkId = network.chainId;
        const accounts = await provider.listAccounts();
        if (!accounts[0]) return;
        setNetworkId(networkId);
        setWalletAddress(accounts[0]);
        setIsConnected(true);

        const reverseName = `${accounts[0].slice(2)}.addr.reverse`;
        const node = ethers.utils.namehash(reverseName);
        const resolverContract_ = new ethers.Contract('0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', PublicResolverABI, provider);
        const ensName_ = await resolverContract_.name(node);
        setENSName(ensName_);

        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
<<<<<<< HEAD
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setIsConnected(false);
      } else {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
      }
    };
  
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
=======
>>>>>>> 480fddff3d386c051b56eca400880782365c1f94

    fetchENSName();
  }, [walletAddress]);

  const fetchAddress = async (search) => {
    const node = ethers.utils.namehash(search + '.eth');
    const resolverContract = new ethers.Contract('0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', PublicResolverABI, provider); 
    let owner = await resolverContract['addr(bytes32)'](node);
    if (owner !== ethers.constants.AddressZero) {
      console.log("Domain already registered by:", owner);
      setMessage("Domain already registered by: " + owner);
      return owner;
    } else {
      return ethers.constants.AddressZero;
    }
  };

  const commit = async (search) => {
    try{
    if (!testinput(search)) return;
    
    const address = await fetchAddress(search);
    if (address !== ethers.constants.AddressZero) {
      console.log("Domain already registered by:", address);
      setMessage("Domain already registered by: " + address);
      return;
    }else {
      setMessage("domain is available. committing...");
    }

    const signer = provider.getSigner();
    const ethReg = new ethers.Contract('0xB9e5B587276fb7d07d5c0D9E356221ea71a6EC1b', ethRegistrarControllerABI.abi, signer);
    const tx = await ethReg.makeCommitment(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), '0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', [], true, 0);
    console.log("Commitment byte32:", tx);
    setdisableCommit(true);

    const tx2 = await ethReg.commit(tx);
    setdisableCommit(true);
    await tx2.wait();
    console.log("Commit:", tx2);
    setMessage('Commitment Successful. Please wait 60 seconds for registration.');

    setTimeout(() => {
      setshowRegister(true);
      setshowCommit(false);
      setMessage('');
    }, 62000);


  } catch (error) {
    console.error('Error:', error);
  }
  }

  const testinput = (e) => {
    const regex = /^[a-zA-Z0-9-]{4,}$/;
    if (!regex.test(e) || e.startsWith('.') || e.endsWith('.')) {
      setMessage('Please enter a valid domain (min 4 characters) that does not start or end with a dot (.)');
      return false;
    } else {
      setMessage('');
      return true;
    }
  }

  const register = async () => {
    const node = ethers.utils.namehash(search + '.eth');
    const signer = provider.getSigner();
    const ethReg = new ethers.Contract('0xB9e5B587276fb7d07d5c0D9E356221ea71a6EC1b', ethRegistrarControllerABI.abi, signer);
    const resolver = new ethers.Contract('0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', PublicResolverABI, signer);
    const price = await ethReg.rentPrice(search, 31536000);
    setTimeout(() => {
    }, 2000);
    const part = (price.toString()).split(",");
    const PRICE = part[0]

    try {
      const tx3 = await ethReg.register(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), '0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', [], true, 0, { value: PRICE });
      await tx3.wait();

      const tx4 = await resolver['setAddr(bytes32,address)'](node, walletAddress.toLowerCase());
      await tx4.wait();
      setMessage('Registration Successful.. !');
      setshowRegister(false);
      setshowCommit(true);
      setdisableCommit(false);
    } catch (error) {
      console.log(error);
      setMessage('Error occurred while registering.. Try again later');
    }
  }

  useEffect(() => {
    if (isConnected) {
      setNetworkId(networkId);
      if (networkId === 1) {
        setNetwork('Ethereum');
      } else if (networkId === 1995) {
        setNetwork('EDEXA testnet');
      } else if (networkId === 5) {
        setNetwork('Goerli');
      } else if (networkId === 17000) {
        setNetwork('Holesky testnet');
      } else if (networkId === 11155111) {
        setNetwork('Sepolia');
      }
    } else {
      setBalance('');
      setENSName('');
      setNetwork('');
      setNetworkId('');
    }
  }, [isConnected]);

  return (
    <div className="container" >
      {isConnected ? (
        <button className="button2" disabled={true} >
          Connected
        </button>
      ) : (
        <button className="button" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}

      <div className="info">
        <p>Wallet Address: {walletAddress}</p>
        <p>ENS Name: {ensName}</p>
        <p>Network: {network}</p>
        <p>Network ID: {networkId}</p>
        <p>Balance: {balance} ETH</p>
      </div>
      <div className="input-container">
        <input style={{width: 'calc(50% - 100px)', marginRight: '20px'}} type="text" onChange={(e) => setSearch(e.target.value)} placeholder="Enter domain name" /><h2 className='TLD'>.eth</h2>
        {showCommit && <button className="button" disabled={disableCommit} style={{cursor: disableCommit ? 'not-allowed' : 'pointer', opacity: disableCommit ? 0.5 : 1}} onClick={() => commit(search)}>Commit your domain</button>}
        {showRegister && <button className='button' onClick={() => register()}>Register</button>}
      </div>
      <h3>{message}</h3>
    </div>
  );
};

export default App;

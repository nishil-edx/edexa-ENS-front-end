import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PublicResolverABI from './PublicResolverABI.json';
import './App.css';
import ensRegistry from './ens-registry.json';
import ethRegistrarControllerABI from './ethRegistrarControllerABI.json';
import avatar from './avatar.png';

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
  const [disableRegister, setdisableRegister] = useState(false);
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

    fetchENSName();
  }, [walletAddress]);

  const fetchAddress = async (search) => {
    const node = ethers.utils.namehash(search + '.eth');
    const resolverContract = new ethers.Contract('0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', PublicResolverABI, provider); 
    let owner = await resolverContract['addr(bytes32)'](node);
    if (owner !== ethers.constants.AddressZero) {
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
      setdisableRegister(false);
      setshowCommit(false);
      setMessage('register now...');
    }, 62000);


  } catch (error) {
    console.error('Error:', error);
    setMessage("error while committing. Please try again");
    setshowRegister(false);
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
      console.log("Price:", price.toString());
    }, 1000);
    const part = (price.toString()).split(",");
    const PRICE = part[0]

    try {
      const tx3 = await ethReg.register(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), '0xBde345E46BD6E069c59A1Af6730854e54A9B60e6', [], true, 0, { value: PRICE, gasLimit: 1000000, gasPrice: 1000000000 });
      setMessage('Registration in progress...');
      setdisableRegister(true);
      await tx3.wait();

      const tx4 = await resolver['setAddr(bytes32,address)'](node, walletAddress.toLowerCase(), { gasLimit: 1000000, gasPrice: 1000000000 });
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
        setNetwork('EDX testnet');
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
    <div className="page-container">

    <div className="CONNECT">
    {isConnected&&network&&<button className='network'>{network}</button>}
    <div className='board'> 
      {isConnected ? (
        <button className="button2" disabled={true}>
        <img class="avatar" src={avatar} ></img>
         {isConnected&&ensName&&<p className='name'>{ensName}</p>}{!ensName&&<p className='name'>{walletAddress.slice(0, 6)}..{walletAddress.slice(-4)}</p>}
        </button>
      ) : (
        <button className="button1" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
  </div>
  {isConnected&&balance&&<button className='balance'>{balance.slice(0, 3)} ETH</button>}
    

    </div>
    <div className="container">
     

      <div className="info">
        <h1>Edexa ENS</h1><br></br>
        
        {ensName&& <p>Hello <p className="ens-name">{ensName}</p></p>}
      
      </div>
      <div className="input-container">
        <input style={{width: 'calc(50% - 100px)', marginRight: '20px'}} type="text" onChange={(e) => setSearch(e.target.value)} placeholder="Enter domain name" /><h2 className='TLD'>.eth</h2>
        {showCommit && <button className="button" disabled={disableCommit} style={{cursor: disableCommit ? 'not-allowed' : 'pointer', opacity: disableCommit ? 0.4 : 1}} onClick={() => commit(search)}>COMMIT</button>}
        {showRegister && <button className='button' disabled={disableRegister} style={{cursor: disableRegister ? 'not-allowed' : 'pointer', opacity: disableRegister ? 0.4 : 1}} onClick={() => register()}>REGISTER</button>}
      </div>
      <h3>{message}</h3>
    </div>
    </div>
  );
};

export default App;

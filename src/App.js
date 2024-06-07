import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PublicResolverABI from './PublicResolverABI.json';
import './App.css';
import edxRegistrarControllerABI from './edxRegistrarControllerABI.json';
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
  
  const [resolverAddress, setResolverAddress]  = useState('');
  const [edxRegistrarControllerAddress, setedxRegistrarControllerAddress] = useState('');

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
         
      if (networkId == 1995) {
        setNetwork('EDX testnet');
        setResolverAddress('0x61c743B3fA8714915fc5687Bb6b4903d11cF2146');
        setedxRegistrarControllerAddress('0x3FF5908aF09530bdf7E351b461e8888f3875Fb58');
      }
        else if (networkId == 5424) {
          setNetwork('EDX MAINNET');
          setResolverAddress('0x7Bd7f30Cd71f3A30d6b7df61ce18b22001952a47');
          setedxRegistrarControllerAddress('0x97Cd4BfBF2d0a6Fd3163cD974ecB6077e4425d0d');
        }else {
          setNetwork('unknown network');
          setMessage('Please connect to edexa testnet or mainnet');
        }

        setWalletAddress(accounts[0]);
        setIsConnected(true);

        const reverseName = `${accounts[0].slice(2)}.addr.reverse`;
        const node = ethers.utils.namehash(reverseName);
        const resolverContract_ = new ethers.Contract(resolverAddress, PublicResolverABI.abi, provider);
        if(isConnected){const ensName_ = await resolverContract_.name(node);
        setENSName(ensName_);}

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
  }, [walletAddress,showRegister]);

  const fetchAddress = async (search) => {
    const node = ethers.utils.namehash(search + '.edx');
    const resolverContract = new ethers.Contract(resolverAddress, PublicResolverABI.abi, provider); 
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
      setMessage(<>Domain already registered by: <br></br><br></br><span style={{ color: 'grey',fontSize: '12px',marginTop: '15px' }}>{address}</span></>);
      return;
    }else {
      setMessage("domain is available. committing...");
    }

    const signer = provider.getSigner();
    const edxReg = new ethers.Contract(edxRegistrarControllerAddress, edxRegistrarControllerABI.abi, signer);
    const resolverAbi = [
      "function setAddr(bytes32 node, address a) external",
      "function setAddr(bytes32 node, uint256 coinType, bytes a) external",
  ];
    const resolver = new ethers.Contract(resolverAddress, resolverAbi, signer);

    const wall = await signer.getAddress(); 

    const node = ethers.utils.namehash(`${search}.edx`);

    const DATA = resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [node,wall]);


    // console.log(DATA)


    const tx = await edxReg.makeCommitment(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), resolverAddress, [DATA], true, 0);
    // console.log("Commitment byte32:", tx);
    setdisableCommit(true);

    const tx2 = await edxReg.commit(tx);
    setdisableCommit(true);
    await tx2.wait();
    // console.log("Commit:", tx2);
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
    const regex = /^[a-zA-Z0-9-.]{4,}$/;
    if (!regex.test(e) || e.startsWith('.') || e.endsWith('.')||e.endsWith('.edx')) {
      setMessage('Please enter a valid domain (min 4 characters) that does not start or end with a dot (.)');
      return false;
    } else {
      setMessage('');
      return true;
    }
  }

  const register = async () => {
    const node = ethers.utils.namehash(search +'.edx');
    const signer = provider.getSigner();
    const edxReg = new ethers.Contract(edxRegistrarControllerAddress, edxRegistrarControllerABI.abi, signer);
    const resolver = new ethers.Contract(resolverAddress, PublicResolverABI.abi, signer);
    const price = await edxReg.rentPrice(search, 31536000);
    setTimeout(() => {
      // console.log("Price:", price.toString());
    }, 1000);
    const part = (price.toString()).split(",");
    const PRICE = part[0]

    try {
    
     
    const signer = provider.getSigner();
    const edxReg = new ethers.Contract(edxRegistrarControllerAddress, edxRegistrarControllerABI.abi, signer);
    const resolverAbi = [
      "function setAddr(bytes32 node, address a) external",
      "function setAddr(bytes32 node, uint256 coinType, bytes a) external",
  ];
    const resolver = new ethers.Contract(resolverAddress, resolverAbi, signer);

    const wall = await signer.getAddress(); 

    const node = ethers.utils.namehash(`${search}.edx`);

    const DATA = resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [node,wall]);


    // console.log(DATA)


      const tx3 = await edxReg.register(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), resolverAddress, [DATA], true, 0, { value: PRICE, gasLimit: 1000000, gasPrice: 1000000000 });
      setMessage('Registration in progress...');
      setdisableRegister(true);
      await tx3.wait();

     
      setMessage('Registration Successful.. !');
      setshowRegister(false);
      setshowCommit(true);
      setdisableCommit(false);
     
      
    } catch (error) {
      console.log(error);
      setMessage('Error occurred while registering.. Try again later');
    }
  }


  return (
    <div className="page-container">

    <div className="CONNECT">

      
      {/* {isConnected&&network&&<img className="eth" src={eth} ></img>} */}
      {isConnected&&network&&<button className='network'>{network}</button>}
      
     

    <div className='board'> 
      {isConnected ? (
        <button className="button2" disabled={true}>
        <img className="avatar" src={avatar} ></img>
         {isConnected&&ensName&&<p className='name'>{ensName}</p>}{!ensName&&<p className='name'>{walletAddress.slice(0, 6)}..{walletAddress.slice(-4)}</p>}
        </button>
      ) : (
        <button className="button1" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
  </div>
  {isConnected&&balance&&<button className='balance'>{balance.slice(0, 6)} {'EDX'}</button>}
    

    </div>
    <div className="container">
     

      <div className="info">
        <h1>Edexa ENS</h1><br></br>
        
        {ensName&& <h3>Hello <p className="ens-name">{ensName}</p></h3>}
        {!ensName&& isConnected&&<h3 className='text'>Hello <p className="ens-name">{walletAddress.slice(0, 6)}..{walletAddress.slice(-4)}</p></h3>}
        {!ensName&&isConnected&&<p className='text'>You dont own a ENS. create on here..</p>}
        {!ensName&&!isConnected&&<p className='text'>*connect wallet to use EDX ENS</p>}
      
      </div>
      <div className="input-container">
        <input style={{width: 'calc(50% - 100px)', marginRight: '20px'}} type="text" onChange={(e) => setSearch(e.target.value)} placeholder="Enter domain name" /><h2 className='TLD'>.edx</h2>
        {showCommit && <button className="button" disabled={disableCommit||!isConnected} style={{cursor: disableCommit ? 'not-allowed' : 'pointer', opacity: disableCommit ? 0.4 : 1}} onClick={() => commit(search)}>COMMIT</button>}
        {showRegister && <button className='button' disabled={disableRegister} style={{cursor: disableRegister ? 'not-allowed' : 'pointer', opacity: disableRegister ? 0.4 : 1}} onClick={() => register()}>REGISTER</button>}
      </div>
      <h3>{message}</h3>
    </div>
    </div>
  );
};

export default App;
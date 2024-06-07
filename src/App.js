import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PublicResolverABI from './PublicResolverABI.json';
import './App.css';
//import ensRegistry from './ens-registry.json';
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

  const[gas, setGas] = useState(30000000);

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
        const Id = network.chainId;
        const accounts = await provider.listAccounts();
        if (!accounts[0]) return;
        setNetworkId(Id);

        
     
      if (networkId == 1995) {
        setNetwork('EDX testnet');
        setResolverAddress('0x4d09E3dA178aAd688053BcBadfd0477382A75389');
        setedxRegistrarControllerAddress('0x420B76d24cC0099303bC0DE1F4C4B150A18104C2');
        setGas(1000000);
      }
        else if (networkId == 5424) {
          setNetwork('EDX MAINNET');
          setResolverAddress('0x4344E466e3B38EF4f728800dB8524170a05565B7');
          setedxRegistrarControllerAddress('0xc8CEebF83a7f923d2B1F1e43D04398f2b9056000');
          setGas(30000000);
        }else {
          setNetwork('unknown network');
          setMessage('Please connect to edexa testnet or mainnet');
        }

        setWalletAddress(accounts[0]);
        setIsConnected(true);

        const reverseName = `${accounts[0].slice(2)}.addr.reverse`;
        const node = ethers.utils.namehash(reverseName);
        const resolverContract_ = new ethers.Contract(resolverAddress, PublicResolverABI.abi, provider);
        if(isConnected==true){
          const ensName_ = await resolverContract_.name(node);
        setENSName(ensName_);
        }

        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(balance));
      } catch (error) {
        
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


    console.log(DATA)


    const tx = await edxReg.makeCommitment(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), resolverAddress, [DATA], true, 0);
    console.log("Commitment byte32:", tx);
    setdisableCommit(true);

    const tx2 = await edxReg.commit(tx,{gasLimit: gas});
    setdisableCommit(true);
    await tx2.wait();
    console.log("Commit:", tx2);
    setMessage('Commitment Successful. Please wait 10 seconds for registration.');
    
    setTimeout(() => {
      setshowRegister(true);
      setdisableRegister(false);
      setshowCommit(false);
      setMessage('register now...');
    }, 12000);


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
    // const node = ethers.utils.namehash(search +'.edx');
    const signer = provider.getSigner();
    const edxReg = new ethers.Contract(edxRegistrarControllerAddress, edxRegistrarControllerABI.abi, signer);
    // const resolver = new ethers.Contract(resolverAddress, PublicResolverABI.abi, signer);
    const price = await edxReg.rentPrice(search, 31536000);
    
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


    console.log(DATA)


      const tx3 = await edxReg.register(search, walletAddress, 31536000, ethers.utils.formatBytes32String(''), resolverAddress, [DATA], true, 0, { value: PRICE ,gasLimit:gas});
      setMessage('Registration in progress...');
      setdisableRegister(true);
      await tx3.wait();

      // call to resolver

      //  setTimeout(() => {
      //   //wait 2 sec
      // }, 4000);

      // const tx4 = await resolver['setAddr(bytes32,address)'](node, walletAddress.toLowerCase(),{gasLimit: 1000000, gasPrice: 1000000000});
      // await tx4.wait();

     
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
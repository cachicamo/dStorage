import DStorage from '../abis/DStorage.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    //Setting up Web3
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    //console.log(web3)  //make sure connects to web3
    //Load accounts
    const accounts = await web3.eth.getAccounts()
    
    //Add first account the the state
    this.setState({ account: accounts[0]})   

    //Get network ID
    const networkId = await web3.eth.net.getId()
    
    //Get network data
    const networkData = DStorage.networks[networkId]
    //Check if net data exists, then
    if(networkData){
      //Assign DStorage contract to a variable
      const dstorage = new web3.eth.Contract(DStorage.abi, networkData.address)
      //Add dstorage to the state
      this.setState({ dstorage: dstorage })

      //Check fileCount
      const fileCount = await dstorage.methods.fileCount().call()

      this.setState({ fileCount })
      
      for(var i =1; i <= fileCount; i++) {
        const file = await dstorage.methods.files(i).call()
        this.setState({
          files: [...this.state.files, file]
        })
      }
    } else {
      window.alert('DStorage contract not deployed to detected network.')
    } 
    this.setState({
      loading: false
    })
  }

  // Get file from user
  captureFile = event => {
    event.preventDefault()

    const file = event.target.files[0]
    const reader = new window.FileReader()
    if(file.type !== "") {
      reader.readAsArrayBuffer(file)

      reader.onloadend = () => {
        this.setState({ 
          buffer: Buffer(reader.result),
          type: file.type,
          name: file.name
        })
      //  console.log('buffer', this.state.buffer)   //check buffer ok
      }
    } else {
      window.alert('Invalid File Type, can not be blank')
    }
  }


  //Upload File
  uploadFile = description => {

    console.log(`Submitting file ${ description } to ipfs...`)

    // adding file to the ipfs
    ipfs.add(this.state.buffer, (error, result) => {
      console.log('Ipfs result', result)
      if(error) {
        console.error(error)
        return
      }
      
      this.setState({ loading: true })
      // put on blockchain
      this.state.dstorage.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ 
          loading: false,
          type: null,
          name: null
        })
        window.location.reload()
      }).on('error', (e) => {
        
        window.alert('Error', e)
        this.setState({ loding: false })
      })
    })

  }

  //Set states
  constructor(props) {
    super(props)
    this.state = {
      buffer: null,
      account: '',
      type: '',
      name: '',
      fileCount: 0,
      files: [],
      dstorage: null,
      loading: true
    }

    //Bind functions
  }

  render() {
    return (
      <div>
        <Navbar account={ this.state.account } />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              files={this.state.files}
              captureFile={this.captureFile}
              uploadFile={this.uploadFile}
            />
        }
      </div>
    );
  }
}

export default App;
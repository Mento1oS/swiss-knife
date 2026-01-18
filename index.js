const express = require('express')
const bodyParser = require('body-parser');
const {createReadStream} = require('fs')
const crypto = require('crypto')
const http = require('http')
const application = require('./app.js')

const app = application(express, bodyParser, createReadStream, crypto, http);
app.listen(process.env.PORT || 3000);

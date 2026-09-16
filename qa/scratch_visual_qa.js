const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/pages'; // assuming pages are served from /pages based on some previous paths, wait let me check if they are served from root or /pages. 
// Wait, in qa_full_e2e.js, it visits `${BASE_URL}/signup.html`, meaning they are served from root!

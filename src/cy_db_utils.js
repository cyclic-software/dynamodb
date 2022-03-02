

const sleep = ms =>
new Promise(resolve => setTimeout(resolve, ms ));

const delay = retryCount =>
new Promise(resolve => setTimeout(resolve, (2 ** retryCount) * (10 + 100 * Math.random()) ));


const RETRY_CODES=[
'ResourceConflictException' // can happen with lambda => ResourceConflictException: The operation cannot be performed at this time. An update is in progress for resource:
]

const with_backoff = async (apiCall, retryCount = 0, lastError = null) => {
if (retryCount > 5) throw new Error(lastError);
try {
  let res = await apiCall();
  return res
} catch (e) {
  if(e.retryable || RETRY_CODES.includes(e.code)){
    console.log(`retry ${retryCount}: ${apiCall}`,e.toString())
    await delay(retryCount);
    return await with_backoff(apiCall,retryCount + 1, e);
  }else{
    console.log('not retryable:',e.toString())
    throw e
  }
}
};


class RetryableError extends Error {
constructor(message) {
  super(message);
  this.retryable = true;
}
}

class ValidationError extends Error {  
  constructor (message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor);
    this.stack = this.stack.split('\n').filter((l,i)=>{return !l.includes('cy_db') && i!=2}).join("\n")
  }
}



const validate_strings = function(s, param_name){
  if(typeof(s)!=='string'){
      throw new ValidationError(`${param_name} must be a string value, received: ${s}`)
  }
  if(s.includes('#')){
      throw new ValidationError(`${param_name} must not contain # character, received: ${s}`)
  }
  return true
}


module.exports = {
  with_backoff,
  RetryableError,
  ValidationError,
  validate_strings,
  delay,
  sleep
}
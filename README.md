# CITA UC Audiographs

## Notes

This version supports a Google Sheets Add-On. Due to CORS issues, we have to be careful with the following:

* If re-generating ```instrument.js```, remember to add ```baseUrl``` as a variable at the top and prefix all fetch calls to WASM files with it: ```fetch(baseUrl + 'mixer32.wasm')```
* If re-generating```instrument.js```, remember to add ```export default faust;``` to allow dynamic importing in ```audiograph.js```
* In ```audiograph.js```, remember to keep the full URL in the dynamic import of ```instrument.js```
* If we move files to another server, we must check all CORS headers are correctly configured (the example below is from lab.adapar.net nginx config):

```
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' lab.adapar.net";
```

* The server must also use HTTPS to serve scripts, otherwise the Google Script sandbox will not allow using them.

**CURRENT: alpha-1.0.0**
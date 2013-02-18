robonet-lightcurve
==================

RoboNET-specific code to display lightcurves. This is the code as existed on the live site on 18 February 2013. This code uses a version of https://github.com/slowe/graph. The file jquery.robonet.js assumes this page is called with a query string of the form `event=OB120521`. It then assumes the JSON file for this is located in `/json_files/OB120521.json`. If the JSON file doesn't exist, nothing gets displayed. An example JSON file is included.
AGuide Viewer
Copyright 2023 Robert Kidd

AGuide Viewer is a reader for AmigaGuide documents implemented as a browser extension.  It is tested with Firefox and Chromium.

Installation
Firefox:
 - Browse to about:debugging#/runtime/this-firefox
 - Choose Load Temporary Add-on...
 - Load aguide.xpi

Chromium:
 - Unzip aguide.xpi
   mkdir aguide-unzipped
   cd aguide-unzipped
   unzip ../aguide.xpi
 - Choose More tools -> Extensions
 - Load aguide-unzipped as an unpacked extension
 
Limitations
Links from one AmigaGuide document to another may not work as expected when browsing local files in Firefox.  Firefox blocks direct links to local files from the extension.  To open such a link, right click, open the link in a new tab or window, then reload the new tab to render.

Contact for bugs, patches, etc
Robert Kidd <robert.kidd@gmail.com>

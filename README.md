# nodejs-web-radio
NodeJS web radio with voice notes.
With this program you can run a web radio where users can add music from YT URL and send voice notes to others.
THE WEBSITE IS NOT MOBILE RESPONSIVE (if i get 5 starts i will do it).

![alt text](https://github.com/JBUinfo/nodejs-web-radio/blob/main/Images/MainPage.png?raw=true)

The admin can create new rooms adding folders at "music" folder.
*The folder's name will be the room's name*

At the Top right corner there is a playlist with the next 5 songs.
At the Bottom right corner you can see all the songs that have the room. (You can search by words song titles).

The admin can see in CMD the start and the end of all the server functions running.
![alt text](https://github.com/JBUinfo/nodejs-web-radio/blob/main/Images/Console.png?raw=true)

# Install
You need to install "FFmpeg" and add /bin/ to environment variables. (It's required by youtube-dl to make conversions).

And:

    npm install express throttle @dropb/ffprobe socket.io
    

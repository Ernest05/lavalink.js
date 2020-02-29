# Lavalink.js

<p>
    Lavalink.js is a JavaScript wrapper wich you can use with your Discord.js bot. It uses the Lavalink technology to broadcast music, so you need Java SE 11 installed in your machine.
</p>
<p>
    First of all, I would to thank Matthieu#2050, a friend and a hobbyist developer wich helped me for implementing the websocket and for fixing some bugs. To thanks them, you can visit his website: <a href="https://matthieu-dev.xyz/" target="_blank">Matthieu Dev</a> :D
</p>

## Wrapper installation:

<p>
    First of all you have to install this module on your projet if you want to use it:</br>
</p>

```md
# Using Yarn:
yarn add ernest05/lavalink.js

# Or using NPM:
npm install ernest05/lavalink.js
```

## Java JDK installation:

<p>
    Let's take care about the Java part currently!</br>
    The Java JRE 11 or higher shoud be installed on your machine. If you have an old version of the Java JRE od JDK please <strong>uninstall</strong> it and <strong>reboot</strong> your machine. Then open your internet browser and paste this URL to the address bar: <a href="https://www.oracle.com/java/technologies/javase-downloads.html" target="_blank">Java SE downloads</a>. You should then arrive on this webpage:</br></br>
    <img src="https://cdn.discordapp.com/attachments/683356350683807765/683356492614729742/unknown.png" alt="Java SE downloads webpage"></br>
    Scroll down to find download versions, and choose the Java SE 11 (LTS) version for stable, and Java SE 13 version for current. Next click on <strong>JDK download</strong>. Then download the adapted setup for your machine, and install it by following indicated instructions, or by reading docs for Linux/Unix systems.
</p>

> <p>Note that is you're using Windows operating system you have to add the Java JDK to path to use it directly from any terminal. For it please read this: <a href="https://javatutorial.net/set-java-home-windows-10" target="_blank">How to set JAVA_HOME in Windows 10</a>.</p>

## Lavalink server installation:

<p>
    Create on your project root directory a folder named 'lavalink'. Next download the <a href="https://github.com/Frederikam/Lavalink/releases/download/3.3/Lavalink.jar" target="_blank"> Lavalink server</a> into it. Then you have to create a file in your code editor, always in the same directory, and named 'application.yml'. This file allow the Lavalink server configuration, by providing broadcasting settings and by providing server host, port and password. Complete this file by pasting <a href="https://github.com/Frederikam/Lavalink/blob/master/LavalinkServer/application.yml.example" target="_blank"> this configuration example</a>. Save the file then.
</p>

## Lavalink server launching:

> <p>To launch the Lavalink server please ensure you are in it's directory.</br></br>Before to launch your application, if it needs Lavalink to work, launch the Lavalink server by following the instructions bellow.</p>

```md
# Locally:
java -jar Lavalink.jar

# With PM2:
pm2 start java --name="Lavalink" -- -jar Lavalink.jar
```

## Use the wrapper for your Discord.js bot:

<p>
    To use lavalink.js and Lavalink on your Discord bot, you have a provided example on the repository, at <a href="https://github.com/Ernest05/lavalink.js/blob/master/example/discord.js/client.js" target="_blank">example/discord.js/client.js</a>. The example bot include all wrapper features for the moment, and will be updated when the wrapper will be.
</p>

> <p>An opensource music bot using lavalink.js is planned soon ^^ In the meantime, please wait and the bot will arrive :D</p>

## Need help?

<p>If you need help, you can join the <a href="https://discord.gg/QzHmA9z" target="_blank"> support server</a> and ask for it, somebody will answer if they can help, don't worry 😉</p>

## An issue, a bug?

<p>
    If you encounter an issue, a bug, either you can join the support server (the link is above), or you can open an issue on GitHub. Thanks for contributing to the module!
</p>

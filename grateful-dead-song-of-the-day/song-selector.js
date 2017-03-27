/**
 * 
 */
'use strict';

const http = require('http');

class SongSelector {
	
	getYears() {
		return new Promise((resolve, reject) => {
			http.request({
				host: "iguana.app.alecgorge.com",
				path: "/api/artists/grateful-dead/years/"
			},
			response => {
				let body = "";
				response.on('data', chunk => {body += chunk;});
				response.on('error', () => {return reject();});
				response.on('end', () => {
					let json = JSON.parse(body);
					return resolve(json.data.map(obj => obj.year));
				});
			}).end();
		});
	}
	
	getDates(year) {
		return new Promise((resolve, reject) => {
			http.request({
				host: "iguana.app.alecgorge.com",
				path: `/api/artists/grateful-dead/years/${year}`
			},
			response => {
				let body = "";
				response.on('data', chunk => {body += chunk;});
				response.on('error', () => {return reject();});
				response.on('end', () => {
					let json = JSON.parse(body);
					return resolve(json.data.shows.map(show => show.display_date));
				});
			}).end();
		});
	}
	
	getShowInfo(year, date) {
		return new Promise((resolve, reject) => {
			http.request({
				host: "iguana.app.alecgorge.com",
				path: `/api/artists/grateful-dead/years/${year}/shows/${date}`
			},
			response => {
				let body = "";
				
				response.on('data', chunk => {body += chunk;});
				response.on('error', () => {return reject();});
				response.on('end', () => {
					let json = JSON.parse(body);
					let info = {};
					info.showTitle = json.data[0].title;
					info.tracks = json.data[0].tracks.map(track => {return {title: track.title, link: track.file};});
					return resolve(info);
				});
			}).end();
		});
	}
	
	getRandomSong() {
		return this.getYears().then(years => {
			let year = years[Math.floor(Math.random() * years.length)];
			return this.getDates(year);
		}).then(dates => {
			let date = dates[Math.floor(Math.random() * dates.length)];
			let y = date.split("-")[0];
			return this.getShowInfo(y, date);
		}).then(info => {
			let song = {};
			song.showName = info.showTitle;
			let index = Math.floor(Math.random() * info.tracks.length);
			song.title = info.tracks[index].title;
			song.link = info.tracks[index].link;
			return song;
		});
	}
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
	return {
		outputSpeech: {
			type: 'PlainText',
			text: output,
		},
		card: {
			type: 'Simple',
			title: `SessionSpeechlet - ${title}`,
			content: `SessionSpeechlet - ${output}`,
		},
		reprompt: {
			outputSpeech: {
				type: 'PlainText',
				text: repromptText,
			},
		},
		shouldEndSession,
	};
}

function getSongOfTheDay(intent, session, callback) {
	const cardTitle = intent.name;
	
	let mySelector = new SongSelector();
	mySelector.getRandomSong().then(info => {
		let speechOutput = "From the " + info.showName + " show, the ong of the day is " + info.title;
		let shouldEndSession = true;
		let response = buildSpeechletResponse(cardTitle, speechOutput, "Jerry On!", shouldEndSession);
		callback({}, response);
	});
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the grateful dead song of the day skill. ' +
        'You can play a random grateful dead song by telling me, play the grateful dead song of the day.';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, "", shouldEndSession));
}


/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Grateful Dead song of the day skill. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'GetGratefulDeadSong') {
    	getSongOfTheDay(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session. Is not called when the skill returns
 * shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
 try {
     console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

     /**
		 * Uncomment this if statement and populate with your skill's
		 * application ID to prevent someone else from configuring a skill that
		 * sends requests to this function.
		 */
     /*
		 * if (event.session.application.applicationId !==
		 * 'amzn1.echo-sdk-ams.app.[unique-value-here]') { callback('Invalid
		 * Application ID'); }
		 */

     if (event.session.new) {
         onSessionStarted({ requestId: event.request.requestId }, event.session);
     }

     if (event.request.type === 'LaunchRequest') {
         onLaunch(event.request,
             event.session,
             (sessionAttributes, speechletResponse) => {
                 callback(null, buildResponse(sessionAttributes, speechletResponse));
             });
     } else if (event.request.type === 'IntentRequest') {
         onIntent(event.request,
             event.session,
             (sessionAttributes, speechletResponse) => {
                 callback(null, buildResponse(sessionAttributes, speechletResponse));
             });
     } else if (event.request.type === 'SessionEndedRequest') {
         onSessionEnded(event.request, event.session);
         callback();
     }
 } catch (err) {
     callback(err);
 }
};

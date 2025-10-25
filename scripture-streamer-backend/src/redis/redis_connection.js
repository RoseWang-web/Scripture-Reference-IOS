import { createClient,
    SCHEMA_FIELD_TYPE,
} from 'redis';

import summarizeText from "../assembly_summary/assembly.ts";

// import dotenv from 'dotenv';

// dotenv.config();


//connect to redis server
const client = createClient({
    username: "default",
    password: "5KcEWqy5kgYm34Sg4m1DG0URum5x9ZZw",
    socket: {
        host: "redis-14008.c253.us-central1-1.gce.redns.redis-cloud.com",
        port: 14008
    }
});

client.on('error', err => console.log('Redis Client Error', err));
try{
    await client.connect();
    console.log('Redis Connected');
} catch(err){
    console.log('Redis Connection Error', err);
}


//mock data for storing as json

const summary = await summarizeText();
console.log(summary)

// let UserName = '';//get this from front-end when user type their name in the beginning
// let FileName = ''; //get this from front-end when user enter their file/speech name
// const data = [{
//     name: UserName,
//     speech_topic: FileName,
//     summary_content: await summarizeText() //get the summary from assemblyAI
// }];

// const prefix = 'AStest:';


// //decide the data type
// await client.ft.create(`idx:${prefix}`, { //idx is a prefix for key
//     '$.name': {
//         type: SCHEMA_FIELD_TYPE.TEXT,
//         AS: 'name'
//     },
//     '$.speech_topic': {
//         type: SCHEMA_FIELD_TYPE.TEXT,
//         AS: 'speech_topic'
//     },
//     '$.summary_content': {
//         type: SCHEMA_FIELD_TYPE.TEXT,
//         AS: 'summary_content'
//     }
// }, {
//     ON: 'JSON',
//     PREFIX: ${prefix}
// });

// //store data to redis
// try {
//     const speeches = await Promise.all(
//     userInputs.map(async (user) => ({
//         name: user.name,
//         speech_topic: user.topic,
//         summary_content: await summarizeText(user.topic), // dynamically summarize each topic
//     }))
//     );
//     const setToResdis = await Promise.all([
//     client.json.set(`${prefix}:${UserName}`, '$', data) //prefix:key, path, data
// ]);

//     console.log('Users stored:', user1Reply, user2Reply, user3Reply);
// }
// catch (err) {
//     console.error('Error storing users:', err);
// }

// // //query data from redis
// // try {
// //     let findPaulResult = await client.ft.search('idx:testUsers', 'Paul @age:[30 40]'); //idx:prefix for key
// //     console.log(findPaulResult); // >>> 1
// //     // findPaulResult.documents[0].value ->the json object of the data
// //     findPaulResult.documents.forEach(doc => {
// //     console.log(`ID: ${doc.id}, name: ${doc.value.name}, age: ${doc.value.age}`);
// // });

// // }
// // catch (err) {
// //     console.error('Error searching users:', err);
// // }




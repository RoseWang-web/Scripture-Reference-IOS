import { createClient,
    SCHEMA_FIELD_TYPE,
} from 'redis';

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


// //mock data for storing as json
// const user1 = {
//     name: 'Paul John',
//     email: 'paul.john@example.com',
//     age: 42,
//     city: 'London'
// };

// const user2 = {
//     name: 'Eden Zamir',
//     email: 'eden.zamir@example.com',
//     age: 29,
//     city: 'Tel Aviv'
// };

// const user3 = {
//     name: 'Paul Zamir',
//     email: 'paul.zamir@example.com',
//     age: 35,
//     city: 'Tel Aviv'
// };


// //decide the data type
// await client.ft.create('idx:testUsers', { //idx is a prefix for key
//     '$.name': {
//         type: SCHEMA_FIELD_TYPE.TEXT,
//         AS: 'name'
//     },
//     '$.city': {
//         type: SCHEMA_FIELD_TYPE.TEXT,
//         AS: 'city'
//     },
//     '$.age': {
//         type: SCHEMA_FIELD_TYPE.NUMERIC,
//         AS: 'age'
//     },
//     '$.email': {
//         type: SCHEMA_FIELD_TYPE.TAG,
//         AS: 'email'
//     }
// }, {
//     ON: 'JSON',
//     PREFIX: 'user:'
// });

// //store data to redis
// try {
//     const [user1Reply, user2Reply, user3Reply] = await Promise.all([
//     client.json.set('testUsers:1', '$', user1), //prefix:key, path, data
//     client.json.set('testUsers:2', '$', user2),
//     client.json.set('testUsers:3', '$', user3)
// ]);

//     console.log('Users stored:', user1Reply, user2Reply, user3Reply);
// }
// catch (err) {
//     console.error('Error storing users:', err);
// }

//query data from redis
try {
    let findPaulResult = await client.ft.search('idx:testUsers', 'Paul @age:[30 40]'); //idx:prefix for key
    console.log(findPaulResult); // >>> 1
    // findPaulResult.documents[0].value ->the json object of the data
    findPaulResult.documents.forEach(doc => {
    console.log(`ID: ${doc.id}, name: ${doc.value.name}, age: ${doc.value.age}`);
});

}
catch (err) {
    console.error('Error searching users:', err);
}




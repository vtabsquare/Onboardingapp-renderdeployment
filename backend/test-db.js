const mongoose = require('mongoose');
const uri = "mongodb+srv://techdotsanjay_db_user:5ic2mHpFvLJZ9lkj@cluster0.1u6liox.mongodb.net/offer_editer?retryWrites=true&w=majority";

console.log("Attempting to connect to MongoDB...");
mongoose.connect(uri)
    .then(() => {
        console.log("Successfully connected to MongoDB Atlas!");
        process.exit(0);
    })
    .catch(err => {
        console.error("Connection failed!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.reason) console.error("Error Reason:", err.reason);
        process.exit(1);
    });

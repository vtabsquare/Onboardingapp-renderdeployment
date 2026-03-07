module.exports = {
    apps: [
        {
            name: 'offer-editor-backend',
            script: 'index.js',
            cwd: './backend',
            env: {
                NODE_ENV: 'production',
                PORT: 5050
            }
        }
    ]
};

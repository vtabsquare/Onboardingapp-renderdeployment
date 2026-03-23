module.exports = {
    apps: [
        {
            name: 'offer-editor',
            script: 'index.js',
            cwd: './backend',
            instances: 1,
            max_memory_restart: '300M',
            merge_logs: true,
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            env_production: {
                NODE_ENV: 'production',
                PORT: 4000
            }
        }
    ]
};

const fs = require('fs').promises;
const path = require('path');
const root = require('../utils/root');
const { errorObj, responseObj } = require('../utils/response');
const { svr_logger } = require('../utils/logger');

module.exports = (req, res) => {
    if (req.params.userId != req.user.id)
        return res.status(401).json(errorObj("Unauthorized"));
    
    const p = path.join(root, `files\\${req.params.userId}`, req.path);

    (async() => {
        const stat = await fs.lstat(p);

        if (req.method === 'GET') 
            await getOrListFiles(res, p, stat);
        else if (req.method === 'POST')
            await uploadFiles(req, res, p, stat);
        else
            throw new Error("Not found");
    })().catch((err) => {
        if (err.code === 'ENOENT') {
            res.status(404).json(errorObj(`Cannot find file ${req.path} under user's directory`));
        } else {
            svr_logger.error(err.message);
            res.status(404).json(errorObj(err.message));
        }
    })
}

async function getOrListFiles(res, filepath, stat) {
    if (stat.isFile()) {
        res.sendFile(filepath);
    } else {
        let outJson = { files: [] }
        const files = await fs.readdir(filepath);

        for (var i in files) {
            const stats = await fs.stat(path.join(filepath, files[i]));
            const isDir = (await fs.lstat(path.join(filepath, files[i]))).isDirectory();

            outJson.files.push({
                name: files[i],
                lastModified: stats.mtime,
                isDirectory: isDir
            });
        }

        res.json(outJson);
    }
}

async function uploadFiles(req, res, dirpath, stat) {
    if (stat.isFile()) {
        return res.status(400).json(errorObj("Invalid path"));
    }
    
    try {
        if (!req.files) {
            res.json(responseObj("No files were uploaded"));
        } else {
            let filepaths = [];
            
            req.files.toUpload.forEach(file => {
                file.mv(dirpath + '/' + file.name);
                filepaths.push(req.path + file.name);
            });

            res.json({
                message: `${filepaths.length} files uploaded`,
                details: filepaths
            });
        }
    } catch (err) {
        svr_logger.error(err.stack);
        res.status(500).json(errorObj(err.message));
    }
}
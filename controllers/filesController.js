const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { errorObj, responseObj } = require('../utils/response');
const { svr_logger } = require('../utils/logger');

const calendarDirPath = path.join(__dirname, '..\\files\\calendars');
if (!fsSync.existsSync(calendarDirPath)) {
    fsSync.mkdirSync(calendarDirPath);
}

module.exports = {
    handleFiles: (req, res) => {
        validateAndRun(req, res, async () => {
            const p = path.join(__dirname, `..\\files\\${req.user.id}`, req.path);

            if (req.method === 'GET')
                await getOrListFiles(res, p);
            else if (req.method === 'POST')
                await uploadFiles(req, res, p);
            else
                return res.status(404).json(errorObj('Not found'));
        }, `Cannot find file/directory ${req.path}`);
    },
    getCalendar: (req, res) => {
        validateAndRun(req, res, async () => {
            const filename = `${req.params.userId}.json`;
            const p = path.join(calendarDirPath, filename);

            await getOrListFiles(res, p);
        }, `Cannot find calendar for user ${req.params.id}`);
    },
    postCalendar: (req, res) => {
        validateAndRun(req, res, async () => {
            const filename = `${req.params.userId}.json`;

            await uploadFiles(req, res, calendarDirPath, filename);
        }, `Cannot find calendar directory`);
    }
}

// Handles validation and error checking
function validateAndRun(req, res, callback, notFoundError) {
    if (req.params.userId != req.user.id)
        return res.status(401).json(errorObj("Unauthorized"));

    (async () => {
        await callback();
    })().catch((err) => {
        if (err.code === 'ENOENT') {
            res.status(404).json(errorObj(notFoundError));
        } else {
            svr_logger.error(err.stack);
            res.status(500).json(errorObj(err.message));
        }
    });
}

async function getOrListFiles(res, filepath) {
    const stat = await fs.lstat(filepath);

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
                lastModified: stats.mtimeMs,
                isDirectory: isDir
            });
        }

        res.json(outJson);
    }
}

async function uploadFiles(req, res, dirpath, newFilename = "") {
    if(!fsSync.existsSync(dirpath)) {
        await fs.mkdir(dirpath, { recursive: true });
    }

    if (!req.files) {
        res.json(responseObj("No files were uploaded"));
    } else {
        let filepaths = [];
        const moveFileCallback = (file) => {
            const filename = newFilename === "" ? file.name : newFilename;

            file.mv(dirpath + '/' + filename);
            filepaths.push(req.path + '/' + filename);
        }

        if (Array.isArray(req.files.toUpload)) {
            req.files.toUpload.forEach(moveFileCallback);
        } else {
            moveFileCallback(req.files.toUpload);
        }

        res.json({
            message: `${filepaths.length} ${filepaths.length == 1 ? 'file' : 'files'} uploaded`,
            details: filepaths
        });
    }
}
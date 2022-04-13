const { Router } = require('express');

const router = Router();

router.get('/:videoId', async (req, res) => {
  try {
    // Ensure there is a range given for the video.
    const range = req.headers.range;
    if (!range)
      return res.status(400).json({ message: 'Requires Range header' });

    const videoId = req.params.videoId;
    const drive = req.drive;
    // Get video stats
    const metadataResp = await drive.files.get({
      fileId: videoId,
      fields: 'size, mimeType'
    });
    const { size, mimeType } = metadataResp.data;

    // Ensure the file to download is a video.
    if (mimeType.split('/')[0] != 'video')
      return res.status(400).json({
        message: 'Bad request. Make sure to provide a valid video fileId.'
      });

    // Parse Range.
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, size - 1);

    // Create headers.
    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': mimeType
    };

    // HTTP Status 206 for Partial Content.
    res.writeHead(206, headers);

    // Stream the video chunk to the client.
    const chunkResp = await drive.files.get(
      {
        fileId: videoId,
        alt: 'media',
        headers: {
          Range: `bytes=${start}-${end}`
        }
      },
      {
        responseType: 'stream'
      }
    );
    chunkResp.data.pipe(res);
  } catch (err) {
    if (err.code == 404)
      return res.status(404).json({
        message: 'Not found. Make sure to provide a valid video fileId'
      });

    res.status(500).json({ message: 'An internal error occurred' });
  }
});

module.exports = router;

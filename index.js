'use strict';

var { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');
var AWS  = require('aws-sdk');
const { uuid } = require('uuidv4');

const s3 = new AWS.S3({ region: "us-east-1" , apiVersion: "2006-03-01" });

module.exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.s3_bucket_name;
    const key = decodeURIComponent(event.s3_object_key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    }; 
    try {
      
        console.log("Trying to fetch " + key);
        const data = await s3.getObject(params).promise();
        console.log(data);

        const existingPdfBytes = data.Body;

        var bytes = new Uint8Array(existingPdfBytes);

        const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

        const pages = pdfDoc.getPages()

        pages.forEach(page => {
            const { width, height } = page.getSize()

            if(height > width){
                page.drawText(event.email, {
                    x: 10,
                    y: height / 2 + 300,
                    size: 50,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                    rotate: degrees(-45),
                    opacity:0.2,
                    maxWidth: page.getWidth(),
                })
                page.drawText(event.date, {
                    x: 15,
                    y: height / 2 + 200,
                    size: 50,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                    rotate: degrees(-45),
                    opacity:0.2,
                    maxWidth: page.getWidth(),
                })
            }
            else {
                page.drawText(event.email, {
                    x: 10,
                    y: height / 2 + 100,
                    size: 45,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                    rotate: degrees(-15),
                    opacity:0.2,
                    maxWidth: page.getWidth(),
                })
                page.drawText(event.date, {
                    x: 15,
                    y: height / 2 + 50,
                    size: 45,
                    font: helveticaFont,
                    color: rgb(0, 0, 0),
                    rotate: degrees(-15),
                    opacity:0.2,
                    maxWidth: page.getWidth(),
                })
            }
        });

        pdfDoc.setTitle(key);
        pdfDoc.setSubject(event.email +' - ' + event.date);

        const pdfBytes = await pdfDoc.save();

        let objectId = uuid();

        const file_key = 'documents/watermarked_pdf/' + objectId + '-' + key;

        const pdf_to_save = {
            Bucket: bucket,
            Key: file_key,
            Body: Buffer.from(pdfBytes),
            Expires: 60 * 60,
            //ContentType: mimeType//geralmente se acha sozinho
        };
    
        const s3_data = await s3.upload(pdf_to_save).promise();

        const signedUrlExpireSeconds = 60 * 30;

        const url = s3.getSignedUrl('getObject', {
            Bucket: bucket,
            Key: file_key,
            Expires: signedUrlExpireSeconds
        });
        
        console.log(url);
        return url;
    } catch (err) {
        console.log(err);
        const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
        console.log(message);
        throw new Error(message);
    }

};

// function getObject (Bucket, Key) {
//     return new Promise(async (resolve, reject) => {
//       const getObjectCommand = new GetObjectCommand({ Bucket, Key })
  
//       try {
//         const response = await client.send(getObjectCommand)
    
//         // Store all of data chunks returned from the response data stream 
//         // into an array then use Array#join() to use the returned contents as a String
//         let responseDataChunks = []
  
//         // Handle an error while streaming the response body
//         response.Body.once('error', err => reject(err))
    
//         // Attach a 'data' listener to add the chunks of data to our array
//         // Each chunk is a Buffer instance
//         response.Body.on('data', chunk => responseDataChunks.push(chunk))
    
//         // Once the stream has no more data, join the chunks into a string and return the string
//         response.Body.once('end', () => resolve(responseDataChunks.join('')))
//       } catch (err) {
//         // Handle the error or throw
//         return reject(err)
//       } 
//     })
//   };
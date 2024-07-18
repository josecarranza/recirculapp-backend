import { EmailClient } from '@azure/communication-email';
import config from './../config';

const connectionString = 'endpoint=https://recirculappsmtp.unitedstates.communication.azure.com/;accesskey=ivhJQmlUn/64no8oHPgWAoh8lN6d0GA1azkR+FmVSx/Az4aCICm2YI0YW61F8BROfb4yUQQHYzJ1i80jVkbtkA=='

// Azure email client setup
const client = new EmailClient(connectionString);

// Helper function to send an email using Azure Communication Services
export const sendEmail = async (to, subject, html) => {
    // Input validation
    if (!to || !subject || !html) {
        throw new Error('Invalid input parameters');
    }

    const emailMessage = {
        senderAddress: 'DoNotReply@recirculapp.com',
        content: {
            subject: subject,
            html: html,
        },
        recipients: {
            to: [{ address: to }],
        },
    };

    // Send the email with retry logic
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const poller = await client.beginSend(emailMessage);
            await poller.pollUntilDone();
            console.log('Email sent successfully');
            break;
        } catch (error) {
            console.error(`Error sending email: ${error.message}`);
            retries++;
            if (retries === MAX_RETRIES) {
                throw new Error(`Error sending email: ${error.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
};
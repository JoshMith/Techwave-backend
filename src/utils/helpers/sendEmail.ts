import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config()


export const sendVerificationEmail =async (to:string,token:string)=>{
    const transporter=nodemailer.createTransport({
        service:'Gmail',
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        },
    });

    const verificationLink=`${process.env.FRONTEND_URL}/verifyEmail?token=${encodeURIComponent(token)}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: 'Welcome to Techwave Electronics - Email Verification',
        html: `
            <p>Dear Customer,</p>
            <p>An account was created with your email address for the <strong>Techwave Electronics Kenya!</strong></p>
            <p>To complete the registration and activate your account, please verify your email address by clicking the link below:</p>
            <p><strong><a href="${verificationLink}">Verify Email</a></strong></p>
            <p>This link will expire in 1 hour for your security.</p>
            <p>If you did not create an account, please ignore this email.</p>
            <br>
            <p>Thank you,<br>The Archdiocese of Nyeri Team</p>
        `,
    }
    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', to);
        return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
        console.error('Error sending email:',error);
        throw new Error('Could not send verification email')
    }
}
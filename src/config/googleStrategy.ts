// config/googleStrategy.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.config';
import { generateToken } from '../utils/helpers/generateToken';
import { Request, Response } from 'express';



passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true,
      scope: ['profile', 'email'],
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Extract user information from Google profile
        const { given_name, family_name, email } = profile._json;
        const phoneNumber = profile.phone_number; // or check profile._json

        // Check if user exists in database
        const userExists = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);

        if (userExists.rows.length > 0) {
          // User exists - return the user
          const user = userExists.rows[0];
          return done(null, user);
        } else {
          // User doesn't exist - create new user
          const newUser = await pool.query(
            `INSERT INTO users
              (name, email, verified, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [given_name + " " + family_name, email, true, 'customer'] // Default role is 'customer'
          );

          return done(null, newUser.rows[0]);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user into session
passport.serializeUser((user: any, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (user_id: string, done) => {
  try {
    const user = await pool.query("SELECT user_id, email, roles FROM users WHERE user_id = $1", [user_id]);
    done(null, user.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
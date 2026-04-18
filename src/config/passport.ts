import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github';
import { UserModel } from '../models/user.model';

type AuthUser = {
    userId: string;
    email: string;
    username: string;
};

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: "/api/profile/auth/google/redirect"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await UserModel.findOne({ googleId: profile.id });

        if (user){
            return done(null, {
                userId: user._id.toString(),
                email: user.email,
                username: user.username,
            });
        }

        let newUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
        if (await UserModel.findOne({ username: newUsername })) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            newUsername += randomSuffix;
        }

        user = new UserModel({
            username: newUsername,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            email: profile.emails?.[0].value || '',
            profilePictureUrl: profile.photos?.[0].value || '',
            googleId: profile.id,
        });
        await user.save();
        return done(null, {
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
        });
    } catch (err) {
        return done(err);
    }
}));


passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID as string,
    clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    callbackURL: "/api/profile/auth/github/redirect"
  },
    async(accessToken, refreshToken, profile, done) => {
    try{
        let user = await UserModel.findOne({ githubId: profile.id });

        if (user){
            return done(null, {
                userId: user._id.toString(),
                email: user.email,
                username: user.username,
            });
        }

        let newUsername = profile.username as string;
        if (await UserModel.findOne({ username: newUsername })) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            newUsername += randomSuffix;
        }

        const githubEmail = profile.emails?.[0]?.value || `${profile.id}@users.noreply.github.com`;
        const fallbackFirstName = profile.displayName || profile.username || 'GitHubUser';

        user = new UserModel({
            username: newUsername,
            firstName: fallbackFirstName,
            lastName: '',
            email: githubEmail,
            profilePictureUrl: profile.photos?.[0].value || '',
            githubId: profile.id,
        });
        await user.save();
        return done(null, {
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
        });
    }catch (err) {
        return done(err);
    }
  }
));


passport.serializeUser((user, done) => {
    const authUser = user as AuthUser;
    done(null, authUser.userId);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await UserModel.findById(id).select('email username');

        if (!user) {
            return done(null, false);
        }

        done(null, {
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
        });
    } catch (error) {
        done(error as Error);
    }
});
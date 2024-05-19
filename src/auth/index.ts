// import NextAuth, { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],
// };

// export const { handlers, auth, signIn, signOut } =
//   NextAuth(authOptions);

// NOTE: Don't do this because this code could be imported into a Client component and it wouldnt work
// let s3Client: S3Client | null = null;

// export function getS3Client(googleIDToken: string): S3Client {
//   console.log(process.env.COGNITO_REGION);
//   if (!s3Client) {
//     s3Client = new S3Client({
//       region: process.env.COGNITO_REGION!,
//       credentials: fromCognitoIdentityPool({
//         clientConfig: { region: process.env.COGNITO_REGION! },
//         identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
//         logins: {
//           "accounts.google.com": googleIDToken,
//         },
//       }),
//     });
//   }

//   return s3Client;
// }

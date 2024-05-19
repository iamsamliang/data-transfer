export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/protected/:path+"],
};

// export default withAuth(
//   function middleware(req: NextRequest) {
//     const { pathname } = req.nextUrl;

//     // Allow requests to the home page or if user is authenticated
//     if (pathname === "/" || req.nextauth.token) {
//       return NextResponse.next();
//     }

//     // Redirect to Google login for protected routes if not authenticated
//     const loginUrl = new URL("/api/auth/signin", req.url);
//     return NextResponse.redirect(loginUrl);
//   },
//   {
//     callbacks: {
//       authorized: ({ token }) => !!token,
//     },
//   }
// );

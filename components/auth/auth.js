import { inIframe } from "../utils/inIframe";
import { toast } from "react-toastify";
import { verifyUser } from "../utils/mongodb";

// secret: userDb.secret, username: userDb.username, email: userDb.email, staff: userDb.staff, canMakeClues: userDb.canMakeClues, supporter: userDb.supporter
let session = false;
// null = not logged in
// false = session loading/fetching

export function signOut() {
  window.localStorage.removeItem("wg_secret");
  session = null;
  if(window.dontReconnect) {
    return;
  }

  // remove all cookies
  console.log("Removing cookies");
  (function () {
    var cookies = document.cookie.split("; ");
    for (var c = 0; c < cookies.length; c++) {
        var d = window.location.hostname.split(".");
        while (d.length > 0) {
            var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
            var p = location.pathname.split('/');
            document.cookie = cookieBase + '/';
            while (p.length > 0) {
                document.cookie = cookieBase + p.join('/');
                console.log(cookieBase + p.join('/'));
                p.pop();
            };
            d.shift();
        }
    }
})();

  window.location.reload();
}

export function signIn() {
  console.log("Signing in");

  if(inIframe()) {
    console.log("In iframe");
    // open site in new window
    const url = window.location.href;
    window.open(url, '_blank');
  }

  // Open login modal instead of Google OAuth
  if (window.openLoginModal) {
    window.openLoginModal();
  }
}

export function useSession() {
  if(typeof window === "undefined") {
    return {
      data: false
    }
  }

  // Removed CrazyGames integration - using pure MongoDB auth only

  if(session === false && !window.fetchingSession && window.cConfig?.apiUrl) {
    let secret = null;
    try {

      secret = window.localStorage.getItem("wg_secret");

    } catch (e) {
      console.error(e);
    }
    if(secret) {

    window.fetchingSession = true;

    console.log(`[Auth] Starting direct MongoDB authentication`);
    
    verifyUser(secret)
      .then((data) => {
        window.fetchingSession = false;
        console.log(`[Auth] Authentication successful`);
        
        if (data.error) {
          console.error(`[Auth] Server error:`, data.error);
          session = null;
          return;
        }

        if (data.secret) {
          window.localStorage.setItem("wg_secret", data.secret);
          session = {token: data};
          console.log(`[Auth] Session established for user:`, data.username);
        } else {
          console.log(`[Auth] No session data received, user not logged in`);
          session = null;
        }
      })
      .catch((e) => {
        window.fetchingSession = false;
        console.error(`[Auth] Authentication failed after all retries:`, e.message);
        
        // Clear potentially corrupted session data
        try {
          window.localStorage.removeItem("wg_secret");
        } catch (err) {
          console.warn(`[Auth] Could not clear localStorage:`, err);
        }
        
        session = null;
        
        // Show user-friendly error after all retries exhausted
        if (retryManager.getRetryCount('auth') >= 5) {
          toast.error('Connection issues detected. Please refresh the page if problems persist.');
        }
      });
    } else {
      session = null;
    }
  }


  return {
    data: session
  }
}

export function getHeaders() {
  let secret = null;
  if(session && session?.token?.secret) {
    secret = session.secret;
  } else {
    try {
      secret = window.localStorage.getItem("wg_secret");
    } catch (e) {
      console.error(e);
    }
  }
  if(!secret) {
    return {};
  }
  return {
    Authorization: "Bearer "+secret
  }
}
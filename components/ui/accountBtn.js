import { signIn } from "@/components/auth/auth";
import { useTranslation } from '@/components/useTranslations'
import sendEvent from "../utils/sendEvent";

export default function AccountBtn({ session, openAccountModal, navbarMode, inCrazyGames }) {
  const { t: text } = useTranslation("common");


  if(inCrazyGames && (!session || !session?.token?.secret)) {
    return null;
  }

  return (
    <>
    {!session || !session?.token?.secret ? (
        <button className={`gameBtn ${navbarMode ? 'navBtn' : 'accountBtn'}`} disabled={inCrazyGames} onClick={() => {
          if(session === null) {
            sendEvent("login_attempt")
            signIn()
          }
          }}>

        { !session?.token?.secret && session !== null ? '...' :
        (
          <div style={{marginRight: '10px',marginLeft: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {!inCrazyGames ? (
              <>
                {text("login")}
              </>
            ): (
              <>
                ...
              </>
            )}
          </div>
        )}
        </button>
    ) : (
        <button className={`gameBtn ${navbarMode ? 'navBtn' : 'accountBtn loggedIn'} ${session?.token?.supporter ? 'supporterBtn' : ''}`} onClick={() => {
        openAccountModal()
        }}>
          {session?.token?.username ? <p style={{ color:'white', paddingRight: '-13px',marginLeft: '0px', fontSize: "1.4em", fontWeight: 700 }}>{session?.token?.username}</p> : null}

        </button>
    )}
    </>
  )
}
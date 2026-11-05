import gi, time, subprocess, urllib.parse, urllib.request, json, sys
gi.require_version('Atspi', '2.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Atspi, Gdk

def get_gmail_win():
    desktop = Atspi.get_desktop(0)
    for i in range(desktop.get_child_count()):
        child = desktop.get_child_at_index(i)
        if child and child.get_name() == 'Google Chrome':
            for j in range(child.get_child_count()):
                win = child.get_child_at_index(j)
                if win and win.get_name() and 'nextchallenge2021@gmail.com' in win.get_name():
                    return win
    return None

def reset_to_inbox():
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', 'https://mail.google.com'])
    for _ in range(8):
        time.sleep(1)
        w = get_gmail_win()
        if w and 'Inbox' in w.get_name():
            return True
    return False

def press_ctrl_enter():
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.PRESS)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Return, None, Atspi.KeySynthType.PRESSRELEASE)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.RELEASE)

def send_smart_prospect(lead_id):
    req = urllib.request.urlopen('http://localhost:3300/api/prospects')
    data = json.loads(req.read().decode('utf-8'))
    p = [x for x in data['prospects'] if x['id'] == lead_id][0]

    email = p['emailData']['email']
    su = p['emailData']['subject']
    body = p['emailData']['fr']

    print(f"\n=======================================================")
    print(f"Smart Dispatch: [{lead_id}] {p['name']} -> {email}")
    print(f"Subject: {su}")

    # 1. Reset to Inbox
    reset_to_inbox()
    time.sleep(1.5)

    # 2. Open compose URL
    compose_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(email)}&su={urllib.parse.quote(su)}&body={urllib.parse.quote(body)}"
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', compose_url])

    for s in range(12):
        time.sleep(1)
        w = get_gmail_win()
        if w and 'Compose' in w.get_name():
            print(f"Compose detected at s={s}: {w.get_name()}")
            break

    print("Waiting 8.0s for editor initialization...")
    time.sleep(8.0)

    # Strategy 1: Direct Ctrl+Enter (editor often focused on load)
    print("Strategy 1: Sending Ctrl+Enter directly...")
    press_ctrl_enter()

    for s in range(5):
        time.sleep(1)
        w = get_gmail_win()
        title = w.get_name() if w else ''
        if title and 'Compose' not in title:
            print(f"✅ Strategy 1 CONFIRMED SENT! Title: {title}")
            return record_sent(lead_id, p['name'], email)

    # Strategy 2: Focus at (960, 500) and Ctrl+Enter
    print("Strategy 2: Clicking at (960, 500) and sending Ctrl+Enter...")
    Atspi.generate_mouse_event(960, 500, 'b1c')
    time.sleep(0.6)
    press_ctrl_enter()

    for s in range(5):
        time.sleep(1)
        w = get_gmail_win()
        title = w.get_name() if w else ''
        if title and 'Compose' not in title:
            print(f"✅ Strategy 2 CONFIRMED SENT! Title: {title}")
            return record_sent(lead_id, p['name'], email)

    # Strategy 3: Focus at (500, 350) and Ctrl+Enter
    print("Strategy 3: Clicking at (500, 350) and sending Ctrl+Enter...")
    Atspi.generate_mouse_event(500, 350, 'b1c')
    time.sleep(0.6)
    press_ctrl_enter()

    for s in range(5):
        time.sleep(1)
        w = get_gmail_win()
        title = w.get_name() if w else ''
        if title and 'Compose' not in title:
            print(f"✅ Strategy 3 CONFIRMED SENT! Title: {title}")
            return record_sent(lead_id, p['name'], email)

    # Strategy 4: Try bottom toolbar Send button area (x=280, y=960)
    print("Strategy 4: Clicking bottom Send button at (280, 960)...")
    Atspi.generate_mouse_event(280, 960, 'b1c')
    time.sleep(0.6)
    for s in range(5):
        time.sleep(1)
        w = get_gmail_win()
        title = w.get_name() if w else ''
        if title and 'Compose' not in title:
            print(f"✅ Strategy 4 CONFIRMED SENT! Title: {title}")
            return record_sent(lead_id, p['name'], email)

    print(f"❌ Could not confirm send for [{lead_id}]. Resetting to Inbox.")
    reset_to_inbox()
    return False

def record_sent(lead_id, name, email):
    req_post = urllib.request.Request(
        'http://localhost:3300/api/confirm-send',
        data=json.dumps({'id': lead_id, 'channel': 'email'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req_post)
        resp = json.loads(res.read().decode('utf-8'))
        print(f"Server DB updated! Emails confirmed sent = {resp['result']['emailsSent']}")
    except Exception as e:
        print("DB update error:", e)
    return True

if __name__ == '__main__':
    lead = sys.argv[1] if len(sys.argv) > 1 else 'NC-INV-038'
    send_smart_prospect(lead)

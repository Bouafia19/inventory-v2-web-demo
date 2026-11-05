import gi, time, subprocess, urllib.parse, urllib.request, json
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
    for _ in range(10):
        time.sleep(1)
        w = get_gmail_win()
        if w and 'Inbox' in w.get_name():
            return True
    return False

def activate_chrome():
    w = get_gmail_win()
    if w:
        w.do_action(0)
        time.sleep(0.5)
        return True
    return False

def send_key_ctrl_enter():
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.PRESS)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Return, None, Atspi.KeySynthType.PRESSRELEASE)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.RELEASE)

def dispatch_38():
    lead_id = 'NC-INV-038'
    req = urllib.request.urlopen('http://localhost:3300/api/prospects')
    data = json.loads(req.read().decode('utf-8'))
    p = [x for x in data['prospects'] if x['id'] == lead_id][0]

    email = p['emailData']['email']
    su = p['emailData']['subject']
    body = p['emailData']['fr']

    print(f"Starting dispatch for [{lead_id}] {p['name']} -> {email}")
    print("Resetting to inbox...")
    reset_to_inbox()
    time.sleep(2)
    activate_chrome()

    compose_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(email)}&su={urllib.parse.quote(su)}&body={urllib.parse.quote(body)}"
    print("Opening compose URL...")
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', compose_url])

    for s in range(15):
        time.sleep(1)
        w = get_gmail_win()
        if w and 'Compose' in w.get_name():
            print(f"Compose window detected at s={s}: {w.get_name()}")
            break

    print("Waiting 10s for Gmail editor to initialize...")
    time.sleep(10)

    # Activate Chrome window before clicking!
    print("Activating Chrome window to front...")
    activate_chrome()
    time.sleep(0.5)

    print("Focusing body with mouse click at (960, 500)...")
    Atspi.generate_mouse_event(960, 500, 'b1c')
    time.sleep(0.8)

    print("Sending Ctrl+Enter...")
    send_key_ctrl_enter()

    confirmed = False
    for s in range(15):
        time.sleep(1)
        w = get_gmail_win()
        title = w.get_name() if w else ''
        print(f"Checking confirmation s={s}: {title}")
        if title and 'Compose' not in title:
            confirmed = True
            break

    if confirmed:
        print(f"✅ CONFIRMED SENT: [{lead_id}] {p['name']}")
        req_post = urllib.request.Request(
            'http://localhost:3300/api/confirm-send',
            data=json.dumps({'id': lead_id, 'channel': 'email'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
            res = urllib.request.urlopen(req_post)
            resp = json.loads(res.read().decode('utf-8'))
            print("DB updated:", resp['result']['emailsSent'])
        except Exception as e:
            print("DB error:", e)
        return True
    else:
        print(f"❌ NOT CONFIRMED")
        return False

if __name__ == '__main__':
    dispatch_38()

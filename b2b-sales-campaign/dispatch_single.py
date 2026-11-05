import gi, time, subprocess, urllib.parse, urllib.request, json, sys
gi.require_version('Atspi', '2.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Atspi, Gdk

def get_gmail_title():
    desktop = Atspi.get_desktop(0)
    for i in range(desktop.get_child_count()):
        child = desktop.get_child_at_index(i)
        if child and child.get_name() == 'Google Chrome':
            for j in range(child.get_child_count()):
                win = child.get_child_at_index(j)
                if win and win.get_name() and 'nextchallenge2021@gmail.com' in win.get_name():
                    return win.get_name()
    return None

def reset_to_inbox():
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', 'https://mail.google.com'])
    for _ in range(10):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Inbox' in t:
            return True
    return False

def send_key_ctrl_enter():
    # Generate abs mouse move and click to ensure focus
    Atspi.generate_mouse_event(960, 500, 'abs')
    time.sleep(0.2)
    Atspi.generate_mouse_event(960, 500, 'b1c')
    time.sleep(0.5)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.PRESS)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Return, None, Atspi.KeySynthType.PRESSRELEASE)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.RELEASE)

def dispatch_lead(lead_id):
    req = urllib.request.urlopen('http://localhost:3300/api/prospects')
    data = json.loads(req.read().decode('utf-8'))
    target = None
    for p in data['prospects']:
        if p['id'] == lead_id:
            target = p
            break
    if not target:
        print(f"Lead {lead_id} not found!")
        return False

    name = target['name']
    email = target['emailData']['email']
    su = target['emailData']['subject']
    body = target['emailData']['fr']

    print(f"\n=======================================================")
    print(f"Dispatching single lead: [{lead_id}] {name} -> {email}")
    print(f"Subject: {su}")

    # 1. Reset to Inbox first
    print("Step 1: Resetting to Inbox...")
    reset_to_inbox()
    time.sleep(2)

    # 2. Open compose URL
    print("Step 2: Opening compose URL...")
    compose_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(email)}&su={urllib.parse.quote(su)}&body={urllib.parse.quote(body)}"
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', compose_url])

    # 3. Wait for compose window to load
    compose_loaded = False
    for s in range(15):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Compose' in t:
            compose_loaded = True
            print(f"Compose window detected: {t}")
            break

    if not compose_loaded:
        print("❌ Compose window failed to load within 15s")
        reset_to_inbox()
        return False

    print("Step 3: Waiting 12s for Gmail editor to fully bind...")
    time.sleep(12)

    # 4. Trigger Send via Ctrl+Enter
    print("Step 4: Focusing and sending Ctrl+Enter...")
    send_key_ctrl_enter()

    # 5. Check confirmation
    confirmed = False
    for s in range(15):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Compose' not in t:
            confirmed = True
            print(f"Confirmation detected at sec {s}: {t}")
            break

    if not confirmed:
        print("Attempt 2: Re-focusing and sending Ctrl+Enter again...")
        # Try clicking bottom-left Send button area (x=240, y=940) or body
        Atspi.generate_mouse_event(240, 940, 'abs')
        time.sleep(0.2)
        Atspi.generate_mouse_event(240, 940, 'b1c')
        time.sleep(0.5)
        send_key_ctrl_enter()
        for s in range(15):
            time.sleep(1)
            t = get_gmail_title()
            if t and 'Compose' not in t:
                confirmed = True
                print(f"Confirmation detected at attempt 2 sec {s}: {t}")
                break

    if confirmed:
        print(f"✅ CONFIRMED SENT: [{lead_id}] {name} ({email})")
        req_post = urllib.request.Request(
            'http://localhost:3300/api/confirm-send',
            data=json.dumps({'id': lead_id, 'channel': 'email'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
            res = urllib.request.urlopen(req_post)
            resp_data = json.loads(res.read().decode('utf-8'))
            print(f"Database updated: Total emails confirmed sent = {resp_data['result']['emailsSent']}")
        except Exception as e:
            print(f"Warning: Failed to update server DB: {e}")
        return True
    else:
        print(f"❌ Failed to confirm send for [{lead_id}]")
        reset_to_inbox()
        return False

if __name__ == '__main__':
    lid = sys.argv[1] if len(sys.argv) > 1 else 'NC-INV-038'
    dispatch_lead(lid)

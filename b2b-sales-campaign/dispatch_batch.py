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
    for _ in range(8):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Inbox' in t:
            return True
    return False

def send_key_ctrl_enter():
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.PRESS)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Return, None, Atspi.KeySynthType.PRESSRELEASE)
    time.sleep(0.1)
    Atspi.generate_keyboard_event(Gdk.KEY_Control_L, None, Atspi.KeySynthType.RELEASE)

def dispatch_single_prospect(p):
    pid = p['id']
    name = p['name']
    email = p['emailData']['email']
    su = p['emailData']['subject']
    body = p['emailData']['fr']

    print(f"\n=======================================================")
    print(f"Processing: [{pid}] {name} -> {email}")
    print(f"Subject: {su}")

    # Always ensure clean inbox state
    print("Resetting Chrome tab to Inbox...")
    reset_to_inbox()
    time.sleep(2.0)

    compose_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(email)}&su={urllib.parse.quote(su)}&body={urllib.parse.quote(body)}"
    subprocess.Popen(['google-chrome', '--profile-directory=Profile 1', compose_url])

    # 1. Wait for compose window to load
    compose_loaded = False
    for s in range(16):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Compose' in t:
            compose_loaded = True
            break

    if not compose_loaded:
        print(f"❌ ERROR: Compose window failed to load within 16s for {pid}")
        reset_to_inbox()
        return False

    print(f"Compose window loaded. Waiting 10.0s for Gmail editor to initialize...")
    time.sleep(10.0)

    # 2. Focus message body and send Ctrl+Enter
    Atspi.generate_mouse_event(960, 500, 'b1c')
    time.sleep(0.6)
    send_key_ctrl_enter()

    # 3. Wait for confirmation (title no longer contains Compose)
    confirmed = False
    for s in range(14):
        time.sleep(1)
        t = get_gmail_title()
        if t and 'Compose' not in t:
            confirmed = True
            break

    # If still not closed, try second send attempt with alternate focus
    if not confirmed:
        print("Second attempt: re-focusing at (500, 350) and sending Ctrl+Enter...")
        Atspi.generate_mouse_event(500, 350, 'b1c')
        time.sleep(0.8)
        send_key_ctrl_enter()
        for s in range(14):
            time.sleep(1)
            t = get_gmail_title()
            if t and 'Compose' not in t:
                confirmed = True
                break

    if confirmed:
        print(f"✅ CONFIRMED SENT: [{pid}] {name} ({email})")
        # Post to server to record in Excel & activity report
        req = urllib.request.Request(
            'http://localhost:3300/api/confirm-send',
            data=json.dumps({'id': pid, 'channel': 'email'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
            res = urllib.request.urlopen(req)
            resp_data = json.loads(res.read().decode('utf-8'))
            print(f"Database updated: Total emails confirmed sent = {resp_data['result']['emailsSent']}")
        except Exception as e:
            print(f"Warning: Failed to update server DB: {e}")
        return True
    else:
        print(f"❌ FAILED CONFIRMATION: [{pid}] {name}. Resetting to Inbox.")
        reset_to_inbox()
        time.sleep(2)
        return False

def run_campaign(max_count=None):
    req = urllib.request.urlopen('http://localhost:3300/api/prospects')
    data = json.loads(req.read().decode('utf-8'))
    all_prospects = data['prospects']

    pending_emails = [
        p for p in all_prospects 
        if p.get('emailData') and p['emailData'].get('email') and (not p.get('emailStatus') or 'sent' not in p.get('emailStatus').lower())
    ]

    print(f"Total verified email contacts found: {len([p for p in all_prospects if p.get('emailData') and p['emailData'].get('email')])}")
    print(f"Pending email contacts to process: {len(pending_emails)}")

    to_process = pending_emails[:max_count] if max_count else pending_emails
    success_count = 0
    fail_count = 0

    for idx, p in enumerate(to_process):
        print(f"\n--- Progress: {idx+1}/{len(to_process)} ---")
        ok = dispatch_single_prospect(p)
        if ok:
            success_count += 1
        else:
            fail_count += 1
        
        # Pause 4.0 seconds between sends
        if idx < len(to_process) - 1:
            print("Pausing 4.0s before next send to respect Gmail limits...")
            time.sleep(4.0)

    print(f"\n=======================================================")
    print(f"Batch Execution Finished!")
    print(f"Confirmed Sent: {success_count} | Failed: {fail_count} | Remaining Pending: {len(pending_emails) - success_count}")

if __name__ == '__main__':
    max_c = int(sys.argv[1]) if len(sys.argv) > 1 else None
    run_campaign(max_c)

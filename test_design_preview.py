"""Screenshot the FIFA-style design preview page for review."""
from playwright.sync_api import sync_playwright
import os

# Create screenshots directory
os.makedirs('/tmp/design-preview', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})

    print("Navigating to design preview...")
    page.goto('http://localhost:5173/design-preview')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)  # Extra wait for animations

    # Screenshot 1: Attendance tab (default)
    print("Capturing Attendance tab...")
    page.screenshot(path='/tmp/design-preview/01_attendance.png', full_page=True)

    # Screenshot 2: Performance tab
    print("Capturing Performance tab...")
    perf_tab = page.locator('button:has-text("PERFORMANCE")')
    if perf_tab.count() > 0:
        perf_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='/tmp/design-preview/02_performance.png', full_page=True)

    # Screenshot 3: Other tab
    print("Capturing Other tab...")
    other_tab = page.locator('button:has-text("OTHER")')
    if other_tab.count() > 0:
        other_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='/tmp/design-preview/03_other.png', full_page=True)

    # Screenshot 4: All Stats tab
    print("Capturing All Stats tab...")
    allstats_tab = page.locator('button:has-text("ALL STATS")')
    if allstats_tab.count() > 0:
        allstats_tab.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='/tmp/design-preview/04_allstats.png', full_page=True)

    # Screenshot 5: Mobile view
    print("Capturing mobile view...")
    page.set_viewport_size({'width': 375, 'height': 812})
    page.locator('button:has-text("ATTENDANCE")').click()
    page.wait_for_timeout(1000)
    page.screenshot(path='/tmp/design-preview/05_mobile.png', full_page=True)

    browser.close()
    print("\nScreenshots saved to /tmp/design-preview/")
    print("Files: 01_attendance.png, 02_performance.png, 03_other.png, 04_allstats.png, 05_mobile.png")

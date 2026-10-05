password = "DEMO_ONLY_NOT_A_REAL_SECRET"

def login(username):
    query = "SELECT * FROM users WHERE name = '" + username + "'"
    return query
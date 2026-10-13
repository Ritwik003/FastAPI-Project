import sys
import os

sys.path.append(os.getcwd())

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_views():

    client.post(

        "/auth/register",

        json={

            "first_name": "Ritwik",
            "last_name": "Kumar",
            "email": "ritwik@gmail.com",
            "password": "12345"

        }

    )

    login_response = client.post(
        "/auth/login",
        data={

            "username": "ritwik@gmail.com",
            "password": "12345"

        }

    )

    print(login_response.json())
    token = login_response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = client.get(
        "/patients/views",
        headers=headers
    )

    assert response.status_code == 200
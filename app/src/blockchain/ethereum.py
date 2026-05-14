from eth_account import Account


def generate_ethereum_account() -> dict:
    """
    Generate a new Ethereum account.

    Important:
    - Store only the address in the database.
    - Show the private key to the user only once.
    - Never send the private key through event bus.
    """

    account = Account.create()

    return {
        "address": account.address,
        "private_key": account.key.hex()
    }


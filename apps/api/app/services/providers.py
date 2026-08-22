"""Safe provider-connection metadata over opaque in-memory credentials."""

from uuid import UUID

from app.core.errors import ApiError
from app.domain.models import ProviderConnectionView, ProviderId, SaveProviderConnection
from app.providers.fake import provider_for, validate_model
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories


class ProviderConnectionService:
    def __init__(self, repository: MemoryRepositories, clock: DeterministicClock, ids: DeterministicIds) -> None:
        self.repository, self.clock, self.ids = repository, clock, ids

    async def list(self, user_id: UUID) -> list[ProviderConnectionView]:
        return await self.repository.list_connections(user_id)

    async def save(self, user_id: UUID, command: SaveProviderConnection) -> ProviderConnectionView:
        model = validate_model(command.provider_id, command.model_id)
        await provider_for(command.provider_id).verify_key(command.credential, model)
        raw = command.credential.get_secret_value()
        item = ProviderConnectionView(id=self.ids.next(), provider_id=command.provider_id, model_id=model, key_hint=f"••••{raw[-4:]}", created_at=self.clock.now())
        await self.repository.put_connection(user_id, item)
        await self.repository.put_credential(user_id, item.id, command.credential)
        return item

    async def update_model(self, user_id: UUID, item_id: UUID, model: str) -> ProviderConnectionView:
        item = await self.repository.get_connection(user_id, item_id)
        secret = await self.repository.get_credential(user_id, item_id)
        if item is None or secret is None:
            raise ApiError("provider_not_connected", "Connect this provider before selecting a model.", 404)
        item.model_id = validate_model(item.provider_id, model)
        await provider_for(item.provider_id).verify_key(secret, item.model_id)
        await self.repository.put_connection(user_id, item)
        return item

    async def delete(self, user_id: UUID, item_id: UUID) -> None:
        if await self.repository.get_connection(user_id, item_id) is None:
            raise ApiError("provider_not_connected", "The provider connection was not found.", 404)
        await self.repository.delete_credential(user_id, item_id)
        await self.repository.delete_connection(user_id, item_id)

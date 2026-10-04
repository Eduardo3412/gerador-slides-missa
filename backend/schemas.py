from pydantic import BaseModel, EmailStr, Field

class UsuarioCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr 
    senha: str = Field(min_length=8, max_length=100)

class UsuarioResposta(BaseModel):
    id: int
    nome: str
    email: EmailStr

    model_config = {"from_attributes": True}

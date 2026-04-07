from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models.caixa import CaixaMovimentacao
from app.models.venda import Venda
from app.models.venda_item import VendaItem
from app.models.despesa import Despesa, DespesaCategoria
from app.core.auth import get_current_user
from app.core.security import require_admin
from app.schemas.caixa_schema import (
    CaixaCreate, CaixaResponse,
    AbrirCaixaRequest, FecharCaixaRequest, ResumoDiaResponse, RelatorioPeriodoResponse, HistoricoItem
)

router = APIRouter(prefix="/caixa", tags=["Caixa"])


# ── Registrar movimentação manual ────────────────────────────────────────────
@router.post("/", response_model=CaixaResponse)
def movimentar_caixa(
    dados: CaixaCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if not caixa_esta_aberto(user["empresa_id"], db):
        raise HTTPException(status_code=400, detail="Caixa não está aberto")

    movimentacao = CaixaMovimentacao(
        empresa_id=user["empresa_id"],
        usuario_id=user["user_id"],
        tipo=dados.tipo,
        valor=dados.valor,
        forma_pagamento=dados.forma_pagamento,
        descricao=dados.descricao
    )
    db.add(movimentacao)
    db.commit()
    db.refresh(movimentacao)
    return movimentacao


# ── Listar movimentações ─────────────────────────────────────────────────────
@router.get("/", response_model=list[CaixaResponse])
def listar_caixa(
    limite: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"]
    ).order_by(
        CaixaMovimentacao.data_movimentacao.desc()
    ).offset(offset).limit(limite).all()


# ── Histórico unificado ──────────────────────────────────────────────────────
@router.get("/historico", response_model=list[HistoricoItem])
def historico_unificado(
    limite:      int            = Query(default=50, le=200),
    data_inicio: Optional[date] = Query(default=None),
    data_fim:    Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    empresa_id = user["empresa_id"]
    inicio = datetime.combine(data_inicio, datetime.min.time()) if data_inicio else None
    fim    = datetime.combine(data_fim,    datetime.max.time()) if data_fim    else None

    # Movimentações do caixa (excluindo abertura e fechamento)
    query_caixa = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == empresa_id,
        CaixaMovimentacao.descricao.notin_(["abertura_caixa", "fechamento_caixa"]),
    )
    if inicio: query_caixa = query_caixa.filter(CaixaMovimentacao.data_movimentacao >= inicio)
    if fim:    query_caixa = query_caixa.filter(CaixaMovimentacao.data_movimentacao <= fim)
    movimentacoes = query_caixa.all()

    # Despesas
    query_despesas = (
        db.query(Despesa, DespesaCategoria.nome.label("categoria_nome"))
        .outerjoin(DespesaCategoria, DespesaCategoria.id == Despesa.categoria_id)
        .filter(Despesa.empresa_id == empresa_id)
    )
    if inicio: query_despesas = query_despesas.filter(Despesa.data_despesa >= inicio)
    if fim:    query_despesas = query_despesas.filter(Despesa.data_despesa <= fim)
    despesas = query_despesas.all()

    # Monta lista unificada
    historico = []

    for m in movimentacoes:
        historico.append({
            "id":        f"caixa_{m.id}",
            "origem":    "caixa",
            "tipo":      m.tipo,
            "valor":     float(m.valor),
            "forma":     m.forma_pagamento,
            "descricao": m.descricao,
            "categoria": None,
            "data":      m.data_movimentacao.isoformat(),
        })

    for despesa, cat_nome in despesas:
        historico.append({
            "id":        f"despesa_{despesa.id}",
            "origem":    "despesa",
            "tipo":      "saida",
            "valor":     float(despesa.valor),
            "forma":     None,
            "descricao": despesa.descricao,
            "categoria": cat_nome,
            "data":      despesa.data_despesa.isoformat(),
        })

    historico.sort(key=lambda x: x["data"], reverse=True)
    return historico[:limite]


# ── Resumo do dia ────────────────────────────────────────────────────────────
@router.get("/resumo-dia", response_model=ResumoDiaResponse)
def resumo_dia(
    data: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    dia    = data or date.today()
    inicio = datetime.combine(dia, datetime.min.time())
    fim    = datetime.combine(dia, datetime.max.time())
    empresa_id = user["empresa_id"]

    vendas = db.query(
        func.count(Venda.id).label("quantidade"),
        func.coalesce(func.sum(Venda.total),    0).label("faturamento"),
        func.coalesce(func.sum(Venda.desconto), 0).label("descontos"),
    ).filter(Venda.empresa_id == empresa_id, Venda.data_venda.between(inicio, fim)).first()

    por_forma = db.query(
        Venda.forma_pagamento,
        func.count(Venda.id).label("quantidade"),
        func.sum(Venda.total).label("total")
    ).filter(Venda.empresa_id == empresa_id, Venda.data_venda.between(inicio, fim)
    ).group_by(Venda.forma_pagamento).all()

    lucro = db.query(
        func.coalesce(func.sum(VendaItem.subtotal - (VendaItem.preco_custo * VendaItem.quantidade)), 0).label("lucro_bruto")
    ).join(Venda, Venda.id == VendaItem.venda_id).filter(
        Venda.empresa_id == empresa_id,
        Venda.data_venda.between(inicio, fim),
        VendaItem.preco_custo.isnot(None)
    ).first()

    desp_tabela = db.query(func.coalesce(func.sum(Despesa.valor), 0).label("total")).filter(
        Despesa.empresa_id == empresa_id,
        Despesa.data_despesa.between(inicio, fim)
    ).first()

    desp_caixa = db.query(func.coalesce(func.sum(CaixaMovimentacao.valor), 0).label("total")).filter(
        CaixaMovimentacao.empresa_id == empresa_id,
        CaixaMovimentacao.tipo == "saida",
        CaixaMovimentacao.descricao != "fechamento_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).first()

    total_despesas = float(desp_tabela.total) + float(desp_caixa.total)
    lucro_bruto    = float(lucro.lucro_bruto)

    return {
        "data":          dia.isoformat(),
        "faturamento":   float(vendas.faturamento),
        "descontos":     float(vendas.descontos),
        "lucro_bruto":   lucro_bruto,
        "despesas":      total_despesas,
        "lucro_liquido": lucro_bruto - total_despesas,
        "num_vendas":    vendas.quantidade,
        "por_forma_pagamento": [
            {"forma": r.forma_pagamento or "Não informado", "quantidade": r.quantidade, "total": float(r.total or 0)}
            for r in por_forma
        ],
    }


# ── Relatório por período ────────────────────────────────────────────────────
@router.get("/relatorio", response_model=RelatorioPeriodoResponse)
def relatorio_periodo(
    data_inicio: date = Query(...),
    data_fim:    date = Query(...),
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    if data_fim < data_inicio:
        raise HTTPException(status_code=400, detail="data_fim deve ser maior que data_inicio")
    if (data_fim - data_inicio).days > 365:
        raise HTTPException(status_code=400, detail="Período máximo de 365 dias")

    empresa_id = user["empresa_id"]
    inicio     = datetime.combine(data_inicio, datetime.min.time())
    fim        = datetime.combine(data_fim,    datetime.max.time())

    vendas_dia = db.query(
        func.date(Venda.data_venda).label("dia"),
        func.count(Venda.id).label("num_vendas"),
        func.sum(Venda.total).label("faturamento"),
        func.sum(Venda.desconto).label("descontos"),
    ).filter(Venda.empresa_id == empresa_id, Venda.data_venda.between(inicio, fim)
    ).group_by(func.date(Venda.data_venda)).all()

    lucro_dia = db.query(
        func.date(Venda.data_venda).label("dia"),
        func.sum(VendaItem.subtotal - (VendaItem.preco_custo * VendaItem.quantidade)).label("lucro_bruto")
    ).join(Venda, Venda.id == VendaItem.venda_id).filter(
        Venda.empresa_id == empresa_id,
        Venda.data_venda.between(inicio, fim),
        VendaItem.preco_custo.isnot(None)
    ).group_by(func.date(Venda.data_venda)).all()

    desp_tabela_dia = db.query(
        func.date(Despesa.data_despesa).label("dia"),
        func.sum(Despesa.valor).label("despesas")
    ).filter(Despesa.empresa_id == empresa_id, Despesa.data_despesa.between(inicio, fim)
    ).group_by(func.date(Despesa.data_despesa)).all()

    desp_caixa_dia = db.query(
        func.date(CaixaMovimentacao.data_movimentacao).label("dia"),
        func.sum(CaixaMovimentacao.valor).label("despesas")
    ).filter(
        CaixaMovimentacao.empresa_id == empresa_id,
        CaixaMovimentacao.tipo == "saida",
        CaixaMovimentacao.descricao != "fechamento_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).group_by(func.date(CaixaMovimentacao.data_movimentacao)).all()

    lucro_map       = {str(r.dia): float(r.lucro_bruto or 0) for r in lucro_dia}
    desp_tabela_map = {str(r.dia): float(r.despesas or 0)    for r in desp_tabela_dia}
    desp_caixa_map  = {str(r.dia): float(r.despesas or 0)    for r in desp_caixa_dia}

    dias = []
    total_faturamento = total_lucro = total_despesas = total_vendas = 0

    for row in vendas_dia:
        dia_str = str(row.dia)
        fat     = float(row.faturamento or 0)
        lucro   = lucro_map.get(dia_str, 0)
        desp    = desp_tabela_map.get(dia_str, 0) + desp_caixa_map.get(dia_str, 0)

        dias.append({
            "dia": dia_str, "num_vendas": row.num_vendas,
            "faturamento": fat, "descontos": float(row.descontos or 0),
            "lucro_bruto": lucro, "despesas": desp, "lucro_liquido": lucro - desp,
        })

        total_faturamento += fat; total_lucro += lucro
        total_despesas    += desp; total_vendas += row.num_vendas

    return {
        "data_inicio": data_inicio.isoformat(), "data_fim": data_fim.isoformat(),
        "totais": {
            "faturamento": total_faturamento, "lucro_bruto": total_lucro,
            "despesas": total_despesas, "lucro_liquido": total_lucro - total_despesas,
            "num_vendas": total_vendas,
        },
        "por_dia": dias,
    }


# ── Status do caixa ──────────────────────────────────────────────────────────
@router.get("/status")
def status_caixa(db: Session = Depends(get_db), user=Depends(get_current_user)):
    hoje   = date.today()
    inicio = datetime.combine(hoje, datetime.min.time())
    fim    = datetime.combine(hoje, datetime.max.time())

    abertura = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"],
        CaixaMovimentacao.descricao == "abertura_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).first()

    fechamento = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"],
        CaixaMovimentacao.descricao == "fechamento_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).first()

    return {
        "aberto":          abertura is not None and fechamento is None,
        "saldo_abertura":  float(abertura.valor) if abertura else None,
        "hora_abertura":   abertura.data_movimentacao.isoformat() if abertura else None,
        "hora_fechamento": fechamento.data_movimentacao.isoformat() if fechamento else None,
    }

# ── Abrir caixa ───────────────────────────────────────────────────────────────
@router.post("/abrir")
def abrir_caixa(dados: AbrirCaixaRequest, db: Session = Depends(get_db), user=Depends(require_admin)):
    hoje = date.today()
    inicio = datetime.combine(hoje, datetime.min.time())
    fim    = datetime.combine(hoje, datetime.max.time())

    abertura_existente = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"],
        CaixaMovimentacao.descricao == "abertura_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).with_for_update().first()

    if abertura_existente:
        raise HTTPException(status_code=400, detail="Caixa já foi aberto hoje")

    db.add(CaixaMovimentacao(
        empresa_id=user["empresa_id"], usuario_id=user["user_id"],
        tipo="entrada", valor=dados.saldo_inicial,
        forma_pagamento="dinheiro", descricao="abertura_caixa"
    ))
    db.commit()
    return {"mensagem": "Caixa aberto com sucesso", "saldo_inicial": float(dados.saldo_inicial)}

# ── Fechar caixa ──────────────────────────────────────────────────────────────
@router.post("/fechar")
def fechar_caixa(dados: FecharCaixaRequest, db: Session = Depends(get_db), user=Depends(require_admin)):
    hoje = date.today()
    inicio = datetime.combine(hoje, datetime.min.time())
    fim    = datetime.combine(hoje, datetime.max.time())

    abertura = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"],
        CaixaMovimentacao.descricao == "abertura_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).with_for_update().first()

    if not abertura:
        raise HTTPException(status_code=400, detail="Caixa não foi aberto hoje")

    fechamento_existente = db.query(CaixaMovimentacao).filter(
        CaixaMovimentacao.empresa_id == user["empresa_id"],
        CaixaMovimentacao.descricao == "fechamento_caixa",
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).with_for_update().first()

    if fechamento_existente:
        raise HTTPException(status_code=400, detail="Caixa já foi fechado hoje")

    db.add(CaixaMovimentacao(
        empresa_id=user["empresa_id"], usuario_id=user["user_id"],
        tipo="saida", valor=dados.saldo_final,
        forma_pagamento="dinheiro", descricao="fechamento_caixa"
    ))
    db.commit()
    return {"mensagem": "Caixa fechado com sucesso", "saldo_final": float(dados.saldo_final)}

def caixa_esta_aberto(empresa_id: int, db: Session) -> bool:
    hoje   = date.today()
    inicio = datetime.combine(hoje, datetime.min.time())
    fim    = datetime.combine(hoje, datetime.max.time())

    registros = db.query(CaixaMovimentacao.descricao).filter(
        CaixaMovimentacao.empresa_id == empresa_id,
        CaixaMovimentacao.descricao.in_(["abertura_caixa", "fechamento_caixa"]),
        CaixaMovimentacao.data_movimentacao.between(inicio, fim)
    ).all()

    operacoes = {r.descricao for r in registros}
    return "abertura_caixa" in operacoes and "fechamento_caixa" not in operacoes
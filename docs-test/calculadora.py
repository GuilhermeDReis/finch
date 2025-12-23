"""
Módulo de Calculadora Financeira

Este módulo fornece funções para cálculos financeiros comuns,
incluindo juros compostos, amortização e análise de investimentos.
"""

from typing import List, Tuple
from decimal import Decimal, ROUND_HALF_UP


class CalculadoraFinanceira:
    """
    Classe para realizar cálculos financeiros.

    Attributes:
        precisao (int): Número de casas decimais para arredondamento.
    """

    def __init__(self, precisao: int = 2):
        """
        Inicializa a calculadora com a precisão desejada.

        Args:
            precisao: Número de casas decimais (padrão: 2).
        """
        self.precisao = precisao

    def juros_compostos(
        self,
        principal: float,
        taxa: float,
        periodos: int
    ) -> float:
        """
        Calcula o montante final com juros compostos.

        Args:
            principal: Valor inicial do investimento.
            taxa: Taxa de juros por período (ex: 0.05 para 5%).
            periodos: Número de períodos de capitalização.

        Returns:
            Montante final após os períodos de capitalização.

        Example:
            >>> calc = CalculadoraFinanceira()
            >>> calc.juros_compostos(1000, 0.05, 12)
            1795.86
        """
        montante = principal * ((1 + taxa) ** periodos)
        return round(montante, self.precisao)

    def calcular_parcela(
        self,
        valor_total: float,
        taxa_mensal: float,
        num_parcelas: int
    ) -> float:
        """
        Calcula o valor da parcela usando o sistema Price (parcelas fixas).

        Args:
            valor_total: Valor total a ser financiado.
            taxa_mensal: Taxa de juros mensal (ex: 0.01 para 1%).
            num_parcelas: Número total de parcelas.

        Returns:
            Valor de cada parcela mensal.

        Raises:
            ValueError: Se a taxa ou número de parcelas for inválido.
        """
        if taxa_mensal <= 0:
            raise ValueError("Taxa mensal deve ser maior que zero")
        if num_parcelas <= 0:
            raise ValueError("Número de parcelas deve ser maior que zero")

        parcela = valor_total * (
            (taxa_mensal * (1 + taxa_mensal) ** num_parcelas) /
            ((1 + taxa_mensal) ** num_parcelas - 1)
        )
        return round(parcela, self.precisao)

    def tabela_amortizacao(
        self,
        valor_total: float,
        taxa_mensal: float,
        num_parcelas: int
    ) -> List[dict]:
        """
        Gera a tabela de amortização completa (Sistema Price).

        Args:
            valor_total: Valor total do financiamento.
            taxa_mensal: Taxa de juros mensal.
            num_parcelas: Número de parcelas.

        Returns:
            Lista de dicionários com detalhes de cada parcela:
            - parcela: número da parcela
            - valor_parcela: valor pago na parcela
            - juros: valor dos juros na parcela
            - amortizacao: valor amortizado do principal
            - saldo_devedor: saldo restante após pagamento
        """
        parcela_valor = self.calcular_parcela(valor_total, taxa_mensal, num_parcelas)
        saldo = valor_total
        tabela = []

        for i in range(1, num_parcelas + 1):
            juros = saldo * taxa_mensal
            amortizacao = parcela_valor - juros
            saldo -= amortizacao

            tabela.append({
                "parcela": i,
                "valor_parcela": round(parcela_valor, self.precisao),
                "juros": round(juros, self.precisao),
                "amortizacao": round(amortizacao, self.precisao),
                "saldo_devedor": round(max(0, saldo), self.precisao)
            })

        return tabela

    def roi(self, investimento_inicial: float, retorno_final: float) -> float:
        """
        Calcula o Retorno sobre Investimento (ROI).

        Args:
            investimento_inicial: Valor investido inicialmente.
            retorno_final: Valor final obtido.

        Returns:
            ROI em percentual (ex: 25.5 para 25.5%).
        """
        roi_valor = ((retorno_final - investimento_inicial) / investimento_inicial) * 100
        return round(roi_valor, self.precisao)


def calcular_inflacao_acumulada(taxas_mensais: List[float]) -> float:
    """
    Calcula a inflação acumulada a partir de taxas mensais.

    Args:
        taxas_mensais: Lista de taxas de inflação mensal (ex: [0.5, 0.3, 0.8]).

    Returns:
        Inflação acumulada no período em percentual.

    Example:
        >>> calcular_inflacao_acumulada([0.5, 0.3, 0.8, 0.4])
        2.01
    """
    acumulado = 1.0
    for taxa in taxas_mensais:
        acumulado *= (1 + taxa / 100)

    return round((acumulado - 1) * 100, 2)


if __name__ == "__main__":
    calc = CalculadoraFinanceira()

    # Exemplo de uso
    print("=== Calculadora Financeira ===\n")

    # Juros compostos
    montante = calc.juros_compostos(10000, 0.01, 12)
    print(f"R$ 10.000 a 1% a.m. por 12 meses: R$ {montante}")

    # Parcela de financiamento
    parcela = calc.calcular_parcela(50000, 0.015, 48)
    print(f"Financiamento de R$ 50.000 em 48x a 1.5% a.m.: R$ {parcela}/mês")

    # ROI
    roi = calc.roi(5000, 7500)
    print(f"ROI de investimento (5000 -> 7500): {roi}%")

from enum import Enum
from pathlib import Path
from typing import Awaitable, Callable, Iterable, Literal
from typing_extensions import TypeVar, ParamSpec

sss = str(1)  # inlay hint
foo = 1  # no inlay hint because Literal
T = TypeVar(name="T") # no inlay hint because typevar
U = TypeVar(name="U", bound=int) # no inlay hint because typevar
P = ParamSpec(name="P") # no inlay hint because paramspec
_ = str(1)  # no inlay hint because underscore only variable
Foo = int  # inlay hint of "TypeAlias"
type Bar = str  # no inlay hint
def asdf(a: Foo, b: type[Foo], c: int | str, d: Literal[1, 2], e: type[int], f: Iterable[Path] | Awaitable[int], g: Callable[[], Path]) -> None:
    foo = a # inlay hint
    bar = b # inlay hint (type, but not TypeAlias)
    baz = c # inlay hint
    qux = d # inlay hint
    quxx = e # inlay hint (type, but not TypeAlias)
    quxxx = f
    quxxxx = g
    (a1, a2) = (1, 2)

class Baz(Enum):
    a = 1 # no inlay hint

class Qux:
    def __init__(self) -> None:
        self.a = []


Qux().a = [] # no inlay hint, not a declaratioin
qux: Qux = Qux()
qux.a = [] # no inlay hint
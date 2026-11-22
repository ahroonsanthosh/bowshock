/*---------------------------------------------------------------------------*\
  Derived from OpenFOAM 13's cellLimitedGrad (src/finiteVolume/finiteVolume/
  gradSchemes/limitedGradSchemes/cellLimitedGrad), Copyright (C) 2011-2022
  OpenFOAM Foundation, GNU General Public License version 3 or later.

Class
    Foam::fv::cellVenkatakrishnanGrad

Description
    OpenFOAM's cellLimitedGrad with Venkatakrishnan's limiter in its full
    form, with the smoothing term eps^2 = (K h)^3 (V. Venkatakrishnan,
    "Convergence to steady state solutions of the Euler equations on
    unstructured grids with limiters", J. Comput. Phys. 118, 1995).

    For each face of a cell, with d2 the change the gradient gives from the
    cell's centre to the face's and d1 the largest change to a neighbour in
    d2's direction (the largest rise if d2 > 0, the largest fall if d2 < 0):

        psi = (d1^2 + eps^2 + 2 d1 d2)/(d1^2 + 2 d2^2 + d1 d2 + eps^2)

    and the cell's limiter is the least psi over its faces, capped at 1,
    per component. With eps = 0 this is OpenFOAM's
    Venkatakrishnan::limiter(r) = (r^2 + 2r)/(r^2 + r + 2), r = d1/d2, so
    K = 0 gives cellLimited<Venkatakrishnan> <base> 1 exactly. With eps > 0
    a cell whose changes are small next to eps (a smooth extremum on a fine
    grid) is not limited.

    h is the cell's length: the square root of its wedge face's area for a
    cell on a wedge patch (an axisymmetric case's 2D cell), else the cube
    root of its volume.

    gradSchemes { default cellVenkatakrishnan Gauss linear <K>; }

SourceFiles
    cellVenkatakrishnanGrad.C
    cellVenkatakrishnanGrads.C

\*---------------------------------------------------------------------------*/

#ifndef cellVenkatakrishnanGrad_H
#define cellVenkatakrishnanGrad_H

#include "gradScheme.H"
#include "scalarField.H"

namespace Foam
{
namespace fv
{

template<class Type>
class cellVenkatakrishnanGrad
:
    public fv::gradScheme<Type>
{
    // Private Data

        tmp<fv::gradScheme<Type>> basicGradScheme_;

        //- Venkatakrishnan's K
        const scalar K_;


    // Private Member Functions

        void limitGradient
        (
            const Field<scalar>& limiter,
            Field<vector>& gIf
        ) const;

        void limitGradient
        (
            const Field<vector>& limiter,
            Field<tensor>& gIf
        ) const;

        //- eps^2 = (K h)^3 per cell
        tmp<scalarField> eps2() const;


public:

    TypeName("cellVenkatakrishnan");


    // Constructors

        cellVenkatakrishnanGrad(const fvMesh& mesh, Istream& schemeData)
        :
            gradScheme<Type>(mesh),
            basicGradScheme_(fv::gradScheme<Type>::New(mesh, schemeData)),
            K_(readScalar(schemeData))
        {
            if (K_ < 0)
            {
                FatalIOErrorInFunction
                (
                    schemeData
                )   << "K = " << K_ << " should be >= 0"
                    << exit(FatalIOError);
            }
        }

        cellVenkatakrishnanGrad(const cellVenkatakrishnanGrad&) = delete;


    // Member Functions

        static inline void limitFaceCmpt
        (
            scalar& limiter,
            const scalar maxDelta,
            const scalar minDelta,
            const scalar extrapolate,
            const scalar eps2
        );

        static inline void limitFace
        (
            Type& limiter,
            const Type& maxDelta,
            const Type& minDelta,
            const Type& extrapolate,
            const scalar eps2
        );

        virtual tmp<VolField<typename outerProduct<vector, Type>::type>>
        calcGrad
        (
            const VolField<Type>& vsf,
            const word& name
        ) const;


    // Member Operators

        void operator=(const cellVenkatakrishnanGrad&) = delete;
};


// * * * * * * * * * * * * Inline Member Functions  * * * * * * * * * * * * //

template<class Type>
inline void cellVenkatakrishnanGrad<Type>::limitFaceCmpt
(
    scalar& limiter,
    const scalar maxDelta,
    const scalar minDelta,
    const scalar extrapolate,
    const scalar eps2
)
{
    scalar d1;

    if (extrapolate > small)
    {
        d1 = maxDelta;
    }
    else if (extrapolate < -small)
    {
        d1 = minDelta;
    }
    else
    {
        return;
    }

    const scalar d2 = extrapolate;

    limiter = min
    (
        limiter,
        (sqr(d1) + eps2 + 2*d1*d2)/(sqr(d1) + 2*sqr(d2) + d1*d2 + eps2)
    );
}


template<class Type>
inline void cellVenkatakrishnanGrad<Type>::limitFace
(
    Type& limiter,
    const Type& maxDelta,
    const Type& minDelta,
    const Type& extrapolate,
    const scalar eps2
)
{
    for (direction cmpt=0; cmpt<pTraits<Type>::nComponents; cmpt++)
    {
        limitFaceCmpt
        (
            setComponent(limiter, cmpt),
            component(maxDelta, cmpt),
            component(minDelta, cmpt),
            component(extrapolate, cmpt),
            eps2
        );
    }
}


} // End namespace fv
} // End namespace Foam


#ifdef NoRepository
    #include "cellVenkatakrishnanGrad.C"
#endif

#endif

// ************************************************************************* //

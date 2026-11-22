/*---------------------------------------------------------------------------*\
  Derived from OpenFOAM 13's cellLimitedGrad.C, Copyright (C) 2011-2022
  OpenFOAM Foundation, GNU General Public License version 3 or later.
  Changes: the limiter is Venkatakrishnan's with eps^2 = (K h)^3, and
  cellLimited's coefficient k (which widens the bounds) is left out.
\*---------------------------------------------------------------------------*/

#include "cellVenkatakrishnanGrad.H"
#include "gaussGrad.H"
#include "wedgeFvPatch.H"

// * * * * * * * * * * * * Private Member Functions  * * * * * * * * * * * //

template<class Type>
void Foam::fv::cellVenkatakrishnanGrad<Type>::limitGradient
(
    const Field<scalar>& limiter,
    Field<vector>& gIf
) const
{
    gIf *= limiter;
}


template<class Type>
void Foam::fv::cellVenkatakrishnanGrad<Type>::limitGradient
(
    const Field<vector>& limiter,
    Field<tensor>& gIf
) const
{
    forAll(gIf, celli)
    {
        gIf[celli] = tensor
        (
            cmptMultiply(limiter[celli], gIf[celli].x()),
            cmptMultiply(limiter[celli], gIf[celli].y()),
            cmptMultiply(limiter[celli], gIf[celli].z())
        );
    }
}


template<class Type>
Foam::tmp<Foam::scalarField>
Foam::fv::cellVenkatakrishnanGrad<Type>::eps2() const
{
    const fvMesh& mesh = this->mesh();

    tmp<scalarField> th(new scalarField(cbrt(mesh.V().primitiveField())));
    scalarField& h = th.ref();

    forAll(mesh.boundary(), patchi)
    {
        const fvPatch& p = mesh.boundary()[patchi];

        if (isA<wedgeFvPatch>(p))
        {
            const labelUList& fc = p.faceCells();
            const scalarField& magSf = p.magSf();

            forAll(fc, i)
            {
                h[fc[i]] = sqrt(magSf[i]);
            }
        }
    }

    return pow3(K_*th);
}


// * * * * * * * * * * * * * * * Member Functions  * * * * * * * * * * * * * //

template<class Type>
Foam::tmp
<
    Foam::VolField<typename Foam::outerProduct<Foam::vector, Type>::type>
>
Foam::fv::cellVenkatakrishnanGrad<Type>::calcGrad
(
    const VolField<Type>& vsf,
    const word& name
) const
{
    const fvMesh& mesh = vsf.mesh();

    tmp<VolField<typename outerProduct<vector, Type>::type>>
        tGrad = basicGradScheme_().calcGrad(vsf, name);

    VolField<typename outerProduct<vector, Type>::type>& g = tGrad.ref();

    const labelUList& owner = mesh.owner();
    const labelUList& neighbour = mesh.neighbour();

    const volVectorField& C = mesh.C();
    const surfaceVectorField& Cf = mesh.Cf();

    const scalarField e2(eps2());

    Field<Type> maxVsf(vsf.primitiveField());
    Field<Type> minVsf(vsf.primitiveField());

    forAll(owner, facei)
    {
        label own = owner[facei];
        label nei = neighbour[facei];

        const Type& vsfOwn = vsf[own];
        const Type& vsfNei = vsf[nei];

        maxVsf[own] = max(maxVsf[own], vsfNei);
        minVsf[own] = min(minVsf[own], vsfNei);

        maxVsf[nei] = max(maxVsf[nei], vsfOwn);
        minVsf[nei] = min(minVsf[nei], vsfOwn);
    }


    const typename VolField<Type>::Boundary& bsf =
        vsf.boundaryField();

    forAll(bsf, patchi)
    {
        const fvPatchField<Type>& psf = bsf[patchi];
        const labelUList& pOwner = mesh.boundary()[patchi].faceCells();

        if (psf.coupled())
        {
            const Field<Type> psfNei(psf.patchNeighbourField());

            forAll(pOwner, pFacei)
            {
                label own = pOwner[pFacei];
                const Type& vsfNei = psfNei[pFacei];

                maxVsf[own] = max(maxVsf[own], vsfNei);
                minVsf[own] = min(minVsf[own], vsfNei);
            }
        }
        else
        {
            forAll(pOwner, pFacei)
            {
                label own = pOwner[pFacei];
                const Type& vsfNei = psf[pFacei];

                maxVsf[own] = max(maxVsf[own], vsfNei);
                minVsf[own] = min(minVsf[own], vsfNei);
            }
        }
    }

    maxVsf -= vsf;
    minVsf -= vsf;


    // Create limiter initialised to 1
    // Note: the limiter is not permitted to be > 1
    Field<Type> limiter(vsf.primitiveField().size(), pTraits<Type>::one);

    forAll(owner, facei)
    {
        label own = owner[facei];
        label nei = neighbour[facei];

        // owner side
        limitFace
        (
            limiter[own],
            maxVsf[own],
            minVsf[own],
            (Cf[facei] - C[own]) & g[own],
            e2[own]
        );

        // neighbour side
        limitFace
        (
            limiter[nei],
            maxVsf[nei],
            minVsf[nei],
            (Cf[facei] - C[nei]) & g[nei],
            e2[nei]
        );
    }

    forAll(bsf, patchi)
    {
        const labelUList& pOwner = mesh.boundary()[patchi].faceCells();
        const vectorField& pCf = Cf.boundaryField()[patchi];

        forAll(pOwner, pFacei)
        {
            label own = pOwner[pFacei];

            limitFace
            (
                limiter[own],
                maxVsf[own],
                minVsf[own],
                ((pCf[pFacei] - C[own]) & g[own]),
                e2[own]
            );
        }
    }

    if (fv::debug)
    {
        Info<< "gradient limiter for: " << vsf.name()
            << " max = " << gMax(limiter)
            << " min = " << gMin(limiter)
            << " average: " << gAverage(limiter) << endl;
    }

    limitGradient(limiter, g);
    g.correctBoundaryConditions();
    gaussGrad<Type>::correctBoundaryConditions(vsf, g);

    return tGrad;
}


// ************************************************************************* //
